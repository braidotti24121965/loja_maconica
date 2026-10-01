"use server";

import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";
import crypto from "crypto";

export type RowStatus = "valid" | "warning" | "error";

export type ValidationRow = {
  originalIndex: number;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  status: RowStatus;
  messages: string[];
};

export type ValidationResult = {
  isValid: boolean;
  type: "members" | "dues";
  fileName: string;
  fileHash: string;
  rows: ValidationRow[];
  totalCount: number;
  errorCount: number;
  warningCount: number;
};

// Helper para neutralizar injeções de CSV (Fórmulas Excel)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeCSVValue(val: any): string {
  if (typeof val !== "string") return val;
  let str = val.trim();
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    str = "'" + str; // Neutralize formula
  }
  return str;
}

export async function analyzeCSV(
  storeId: string,
  type: "members" | "dues",
  formData: FormData
): Promise<{ result?: ValidationResult; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nenhum arquivo enviado." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { error: "Formato inválido. Apenas .csv é aceito." };
  if (file.size > 2 * 1024 * 1024) return { error: "O arquivo excede o limite de 2 MB." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "Acesso negado." };
  if (type === "members" && !["admin", "secretary"].includes(membership.role)) return { error: "Acesso negado." };
  if (type === "dues" && !["admin", "treasurer"].includes(membership.role)) return { error: "Acesso negado." };

  const fileText = await file.text();
  if (!fileText.trim()) return { error: "O arquivo está vazio." };

  const fileHash = crypto.createHash("sha256").update(fileText).digest("hex");

  const parseResult = Papa.parse(fileText, {
    header: true,
    skipEmptyLines: true,
    transform: sanitizeCSVValue,
  });

  if (parseResult.errors.length > 0) {
    return { error: `Erro no parsing do CSV: ${parseResult.errors[0].message}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows = parseResult.data as Record<string, any>[];
  if (rawRows.length === 0) return { error: "O arquivo não contém linhas de dados." };
  if (rawRows.length > 2000) return { error: "O arquivo excede o limite de 2.000 linhas." };

  // Fetch brothers for validation
  const { data: brothers } = await supabase
    .from("brothers")
    .select("id, full_name, cim")
    .eq("store_id", storeId);
  const existingBrothers = brothers || [];

  const validatedRows: ValidationRow[] = [];
  let errorCount = 0;
  let warningCount = 0;

  // Additional data fetching for dues
  const existingDuesMap = new Set<string>();
  if (type === "dues") {
    const { data: dues } = await supabase.from("monthly_dues").select("brother_id, competence").eq("store_id", storeId);
    (dues || []).forEach(d => existingDuesMap.add(`${d.brother_id}_${d.competence}`));
  }

  const cimsInFile = new Set<string>();

  rawRows.forEach((row, idx) => {
    const originalIndex = idx + 2; // +1 for 0-index, +1 for header
    let status: RowStatus = "valid";
    const messages: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedData: any = {};

    if (type === "members") {
      const nome = row["nome"] || row["Nome"];
      const cim = row["cim"] || row["CIM"];
      const grau = row["grau"] || row["Grau"];
      const telefone = row["telefone"] || row["Telefone"];

      if (!nome) { status = "error"; messages.push("Nome é obrigatório."); }
      if (!grau) { status = "error"; messages.push("Grau é obrigatório."); }

      if (cim) {
        if (existingBrothers.find(b => b.cim === cim)) {
          status = "error"; messages.push(`CIM ${cim} já cadastrado no sistema.`);
        }
        if (cimsInFile.has(cim)) {
          status = "error"; messages.push(`CIM ${cim} duplicado no arquivo.`);
        }
        cimsInFile.add(cim);
      }

      normalizedData.full_name = nome;
      normalizedData.cim = cim || null;
      normalizedData.degree = grau;
      normalizedData.phone = telefone || null;
    } else if (type === "dues") {
      const identificador = row["identificador"] || row["CIM"] || row["Nome"];
      const competencia = row["competencia"] || row["Competência"];
      const valorStr = row["valor"] || row["Valor"];
      const vencimento = row["vencimento"] || row["Vencimento"];
      const situacao = (row["situacao"] || row["Situação"] || "pending").toLowerCase();
      const dtPagto = row["data_pagamento"] || row["Data Pagamento"];
      const formaPagto = row["forma_pagamento"] || row["Forma Pagamento"];

      if (!identificador) { status = "error"; messages.push("Identificador (CIM ou Nome) é obrigatório."); }
      if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) { status = "error"; messages.push("Competência inválida. Use AAAA-MM."); }
      if (!vencimento) { status = "error"; messages.push("Vencimento é obrigatório."); }
      
      const parsedValor = parseFloat((valorStr || "").replace(",", "."));
      if (isNaN(parsedValor) || parsedValor < 0) { status = "error"; messages.push("Valor numérico inválido."); }

      const allowedStatus = ["pending", "paid", "overdue", "exempt", "canceled"];
      let finalStatus = situacao;
      if (situacao === "pendente") finalStatus = "pending";
      if (situacao === "pago") finalStatus = "paid";
      if (situacao === "vencido") finalStatus = "overdue";
      if (situacao === "isento") finalStatus = "exempt";
      if (situacao === "cancelado") finalStatus = "canceled";
      
      if (!allowedStatus.includes(finalStatus)) {
        status = "error"; messages.push(`Situação inválida: ${situacao}. Use pendente, pago, vencido, isento ou cancelado.`);
      }

      let brotherId = null;
      if (identificador) {
        const foundByCim = existingBrothers.find(b => b.cim === identificador);
        if (foundByCim) {
          brotherId = foundByCim.id;
        } else {
          const foundByName = existingBrothers.filter(b => b.full_name.toLowerCase().includes(identificador.toLowerCase()));
          if (foundByName.length === 1) brotherId = foundByName[0].id;
          else if (foundByName.length > 1) { status = "error"; messages.push("Múltiplos membros encontrados com este nome."); }
          else { status = "error"; messages.push("Membro não encontrado pelo CIM ou Nome."); }
        }
      }

      if (brotherId && competencia) {
        if (existingDuesMap.has(`${brotherId}_${competencia}`)) {
          status = "error"; messages.push("Mensalidade já lançada para este membro nesta competência.");
        }
        const dueKeyInFile = `${brotherId}_${competencia}`;
        if (cimsInFile.has(dueKeyInFile)) {
          status = "error"; messages.push("Mensalidade duplicada para este membro no próprio arquivo.");
        }
        cimsInFile.add(dueKeyInFile);
      }

      normalizedData.brother_id = brotherId;
      normalizedData.brother_name = identificador;
      normalizedData.competence = competencia;
      normalizedData.due_date = vencimento;
      normalizedData.amount = parsedValor;
      normalizedData.status = finalStatus;
      normalizedData.payment_date = dtPagto || null;
      normalizedData.payment_method = formaPagto || null;
    }

    if (status === "error") errorCount++;
    if ((status as RowStatus) === "warning") warningCount++;

    validatedRows.push({
      originalIndex,
      data: normalizedData,
      status,
      messages
    });
  });

  return {
    result: {
      isValid: errorCount === 0,
      type,
      fileName: file.name,
      fileHash,
      rows: validatedRows,
      totalCount: validatedRows.length,
      errorCount,
      warningCount
    }
  };
}

export async function confirmImport(storeId: string, result: ValidationResult): Promise<{ error?: string }> {
  if (!result.isValid || result.errorCount > 0) return { error: "Existem linhas com erro. A importação parcial não é permitida." };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: membership } = await supabase.from("store_memberships").select("role").eq("store_id", storeId).eq("user_id", user.id).single();
  if (!membership) return { error: "Acesso negado." };

  const payload = result.rows.map(r => r.data);

  if (result.type === "members") {
    if (!["admin", "secretary"].includes(membership.role)) return { error: "Acesso negado." };
    const { error } = await supabase.rpc("import_members_batch", {
      p_store_id: storeId,
      p_user_id: user.id,
      p_members: payload,
      p_file_name: result.fileName,
      p_file_hash: result.fileHash
    });
    if (error) return { error: error.message };
  } else if (result.type === "dues") {
    if (!["admin", "treasurer"].includes(membership.role)) return { error: "Acesso negado." };
    const { error } = await supabase.rpc("import_dues_batch", {
      p_store_id: storeId,
      p_user_id: user.id,
      p_dues: payload,
      p_file_name: result.fileName,
      p_file_hash: result.fileHash
    });
    if (error) return { error: error.message };
  }

  return {};
}
