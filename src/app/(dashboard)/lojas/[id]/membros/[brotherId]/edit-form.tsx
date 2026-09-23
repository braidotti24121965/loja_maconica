"use client";

import { useActionState, useState } from "react";
import { updateBrother, deleteBrother, addDependent, deleteDependent } from "./actions";
import { Trash } from "lucide-react";

export function EditBrotherForm({ storeId, brother }: { storeId: string, brother: any }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await updateBrother(data);
  }, null);

  const dependents = brother.dependents || [];

  return (
    <div>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
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

      <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "32px 0" }} />

      <h3 style={{ marginBottom: 16 }}>Família e Dependentes</h3>
      
      {dependents.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
          {dependents.map((dep: any) => (
            <li key={dep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 8, backgroundColor: "var(--background-alt)" }}>
              <div>
                <strong>{dep.name}</strong> <span className="badge" style={{ marginLeft: 8 }}>{dep.relationship}</span>
                {dep.birthdate && <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>Nascimento: {new Date(dep.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>}
              </div>
              <form action={deleteDependent}>
                <input type="hidden" name="id" value={dep.id} />
                <button type="submit" style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 4 }} title="Remover" onClick={(e) => {
                  if (!confirm("Remover familiar?")) e.preventDefault();
                }}>
                  <Trash size={16} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle" style={{ fontSize: 14, marginBottom: 24 }}>Nenhum familiar cadastrado.</p>
      )}

      <form action={addDependent} className="form" style={{ background: "var(--background-alt)", padding: 16, borderRadius: 6, border: "1px solid var(--border)" }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: 14 }}>Adicionar Familiar</h4>
        <input type="hidden" name="brother_id" value={brother.id} />
        
        <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <input name="name" type="text" required placeholder="Nome do familiar" style={{ height: 38 }} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <select name="relationship" required style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
              <option value="Esposa">Esposa</option>
              <option value="Filho(a)">Filho(a)</option>
              <option value="Pai">Pai</option>
              <option value="Mãe">Mãe</option>
              <option value="Enteado(a)">Enteado(a)</option>
              <option value="Sogro(a)">Sogro(a)</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input name="birthdate" type="date" placeholder="Nascimento" style={{ height: 38 }} />
          </div>
          <button className="button" type="submit" style={{ height: 38, padding: "0 16px" }}>Adicionar</button>
        </div>
      </form>
    </div>
  );
}
