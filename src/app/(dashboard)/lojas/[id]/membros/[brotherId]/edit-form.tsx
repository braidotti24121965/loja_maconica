"use client";

import { useActionState } from "react";
import { updateBrother, deleteBrother } from "./actions";

export function EditBrotherForm({ storeId, brother }: { storeId: string, brother: any }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await updateBrother(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="brother_id" value={brother.id} />

      <div className="field">
        <label htmlFor="full_name">Nome Completo</label>
        <input id="full_name" name="full_name" type="text" required defaultValue={brother.full_name} />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="cim">CIM (Exatamente 7 dígitos)</label>
          <input id="cim" name="cim" type="text" pattern="\d{7}" maxLength={7} title="O CIM deve conter exatamente 7 números." placeholder="Ex: 1234567" defaultValue={brother.cim || ""} />
        </div>

        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="degree">Grau</label>
          <select id="degree" name="degree" required defaultValue={brother.degree} style={{ width: "100%", height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
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
          <select id="office" name="office" defaultValue={brother.office || ""} style={{ width: "100%", height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
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
          <input id="phone" name="phone" type="text" placeholder="(DD) 99999-9999" defaultValue={brother.phone || ""} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar Alterações"}
        </button>

        <button 
          type="submit" 
          formAction={async (formData) => {
            if (confirm("Tem certeza que deseja excluir esta ficha? Essa ação não pode ser desfeita.")) {
              await deleteBrother(formData);
            }
          }}
          className="subtle" 
          style={{ background: "transparent", border: "none", color: "var(--destructive)", textDecoration: "underline", cursor: "pointer", fontSize: 14 }}
        >
          Excluir Ficha
        </button>
      </div>
    </form>
  );
}
