"use client";

import { useActionState, use } from "react";
import { createBrother } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NovoMembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params);
  
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await createBrother(data);
  }, null);

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/membros`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Membros
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Ficha do Irmão</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Cadastre um obreiro no quadro da Loja.</p>
      
      <div className="card">
        <form action={action} className="form">
          {state?.error && <div className="message error">{state.error}</div>}
          
          <input type="hidden" name="store_id" value={storeId} />

          <div className="field">
            <label htmlFor="full_name">Nome Completo</label>
            <input id="full_name" name="full_name" type="text" required />
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="cim">CIM (Exatamente 7 dígitos)</label>
              <input id="cim" name="cim" type="text" pattern="\d{7}" maxLength={7} title="O CIM deve conter exatamente 7 números." placeholder="Ex: 1234567" />
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="degree">Grau</label>
              <select id="degree" name="degree" required style={{ width: "100%", height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
                <option value="Aprendiz">Aprendiz</option>
                <option value="Companheiro">Companheiro</option>
                <option value="Mestre">Mestre</option>
                <option value="Mestre Instalado">Mestre Instalado</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="office">Cargo Atual na Loja</label>
              <select id="office" name="office" style={{ width: "100%", height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
                <option value="">Sem cargo (Membro)</option>
                <option value="Venerável Mestre">Venerável Mestre</option>
                <option value="1º Vigilante">1º Vigilante</option>
                <option value="2º Vigilante">2º Vigilante</option>
                <option value="Orador">Orador</option>
                <option value="Secretário">Secretário</option>
                <option value="Tesoureiro">Tesoureiro</option>
                <option value="Chanceler">Chanceler</option>
                <option value="Hospitaleiro">Hospitaleiro</option>
                <option value="Mestre de Cerimônias">Mestre de Cerimônias</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="phone">Celular (Opcional)</label>
              <input id="phone" name="phone" type="text" placeholder="(DD) 99999-9999" />
            </div>
          </div>

          <button className="button" type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar Ficha"}
          </button>
        </form>
      </div>
    </div>
  );
}
