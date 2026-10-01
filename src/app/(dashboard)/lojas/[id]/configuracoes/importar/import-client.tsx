"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, AlertTriangle, FileSpreadsheet, Loader2, Download } from "lucide-react";
import { analyzeCSV, confirmImport, ValidationResult } from "./actions";
import { useRouter } from "next/navigation";

export default function ImportClient({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [importType, setImportType] = useState<"members" | "dues">("members");
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
      setSuccess(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { result: res, error } = await analyzeCSV(storeId, importType, formData);
      if (error) {
        setErrorMsg(error);
      } else if (res) {
        setResult(res);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(err.message || "Erro desconhecido ao analisar o arquivo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    setIsConfirming(true);
    setErrorMsg(null);
    try {
      const { error } = await confirmImport(storeId, result);
      if (error) {
        setErrorMsg(error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(err.message || "Erro desconhecido ao confirmar importação.");
    } finally {
      setIsConfirming(false);
    }
  };

  const downloadTemplate = () => {
    let csvContent = "";
    let fileName = "";
    if (importType === "members") {
      csvContent = "Nome,CIM,Grau,Telefone\nJoão da Silva,123456,Mestre,11999999999\n";
      fileName = "modelo_membros.csv";
    } else {
      csvContent = "CIM,Competência,Valor,Vencimento,Situação,Data Pagamento,Forma Pagamento\n123456,2026-01,150.00,2026-01-10,pago,2026-01-09,PIX\n";
      fileName = "modelo_mensalidades.csv";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (success) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <CheckCircle2 size={48} color="var(--green-dark)" style={{ margin: "0 auto 16px auto" }} />
        <h2 style={{ margin: "0 0 8px 0" }}>Importação Concluída com Sucesso!</h2>
        <p className="subtle" style={{ marginBottom: 24 }}>Os dados foram inseridos de forma integral e segura no banco de dados.</p>
        <button onClick={() => router.push(`/lojas/${storeId}`)} className="button">
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      {!result ? (
        <>
          <h2 style={{ fontSize: 18, margin: "0 0 24px 0" }}>1. Selecione o que deseja importar</h2>
          
          <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 24px", border: "1px solid", borderColor: importType === "members" ? "var(--brand)" : "var(--border)", borderRadius: 8, cursor: "pointer", background: importType === "members" ? "var(--brand-soft)" : "transparent" }}>
              <input type="radio" name="type" value="members" checked={importType === "members"} onChange={() => setImportType("members")} style={{ margin: 0 }} />
              <span style={{ fontWeight: importType === "members" ? 600 : 400, color: importType === "members" ? "var(--brand)" : "inherit" }}>Quadro de Obreiros</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 24px", border: "1px solid", borderColor: importType === "dues" ? "var(--brand)" : "var(--border)", borderRadius: 8, cursor: "pointer", background: importType === "dues" ? "var(--brand-soft)" : "transparent" }}>
              <input type="radio" name="type" value="dues" checked={importType === "dues"} onChange={() => setImportType("dues")} style={{ margin: 0 }} />
              <span style={{ fontWeight: importType === "dues" ? 600 : 400, color: importType === "dues" ? "var(--brand)" : "inherit" }}>Histórico de Mensalidades</span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>2. Envie o arquivo (.csv)</h2>
            <button type="button" onClick={downloadTemplate} className="button" style={{ background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)", fontSize: 13, gap: 6, padding: "6px 12px" }}>
              <Download size={14} /> Baixar Modelo
            </button>
          </div>

          <div style={{ border: "2px dashed var(--border)", borderRadius: 8, padding: 48, textAlign: "center", background: "var(--page)" }}>
            <FileSpreadsheet size={48} color="var(--subtle)" style={{ margin: "0 auto 16px auto" }} />
            <p style={{ margin: "0 0 16px 0", fontWeight: 500 }}>Arraste e solte ou clique para selecionar</p>
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "block", margin: "0 auto 16px auto" }} />
            <p className="subtle" style={{ fontSize: 13, margin: 0 }}>Tamanho máximo: 2 MB. Limite de 2.000 linhas.</p>
          </div>

          {errorMsg && (
            <div className="message message-error" style={{ marginTop: 24 }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button 
              className="button" 
              onClick={handleAnalyze} 
              disabled={!file || isAnalyzing}
              style={{ gap: 8 }}
            >
              {isAnalyzing ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
              Analisar Arquivo
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 18, margin: "0 0 24px 0" }}>3. Pré-visualização</h2>
          
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--page)", border: "1px solid var(--border)", flex: 1 }}>
              <div className="subtle" style={{ fontSize: 13 }}>Total de Linhas</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.totalCount}</div>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--danger)" }}>Erros Encontrados</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)" }}>{result.errorCount}</div>
            </div>
          </div>

          {errorMsg && (
            <div className="message message-error" style={{ marginBottom: 24 }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 24 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Linha</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th>Dados Processados</th>
                  <th>Mensagens</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} style={{ background: row.status === 'error' ? '#fef2f2' : row.status === 'warning' ? '#fffbeb' : 'transparent' }}>
                    <td style={{ color: "var(--subtle)" }}>{row.originalIndex}</td>
                    <td>
                      {row.status === 'valid' && <span style={{ color: "var(--green-dark)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14}/> Válido</span>}
                      {row.status === 'error' && <span style={{ color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={14}/> Erro</span>}
                      {row.status === 'warning' && <span style={{ color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14}/> Aviso</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {importType === 'members' 
                        ? `${row.data.full_name} (${row.data.degree}) - CIM: ${row.data.cim || '-'}`
                        : `${row.data.brother_name} - ${row.data.competence} - R$ ${row.data.amount} (${row.data.status})`
                      }
                    </td>
                    <td style={{ fontSize: 13, color: row.status === 'error' ? 'var(--danger)' : 'var(--subtle)' }}>
                      {row.messages.join(" ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button 
              className="button" 
              onClick={() => { setResult(null); setFile(null); }} 
              style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}
              disabled={isConfirming}
            >
              Cancelar
            </button>
            <button 
              className="button" 
              onClick={handleConfirm} 
              disabled={result.errorCount > 0 || isConfirming}
              style={{ gap: 8 }}
            >
              {isConfirming && <Loader2 size={16} className="spin" />}
              Confirmar Importação Integral
            </button>
          </div>
          {result.errorCount > 0 && (
            <p className="subtle" style={{ textAlign: "right", marginTop: 8, fontSize: 13 }}>
              Corrija os erros na planilha para poder continuar. A importação parcial não é permitida.
            </p>
          )}
        </>
      )}
    </div>
  );
}
