"use client";

import { useActionState, useState } from "react";
import { updateBrother, deleteBrother, addDependent, deleteDependent, editDependent, linkOwnUserToBrother } from "./actions";
import { Trash, Pencil, Link as LinkIcon, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function EditBrotherForm({ storeId, brother }: { storeId: string, brother: { id: string; full_name: string; email?: string | null; cim: string | null; degree: string; office: string | null; phone: string | null; birthdate?: string | null; user_id?: string | null; dependents?: { id: string; name: string; relationship: string; birthdate: string | null; }[] } }) {
  const [state, action, pending] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    return await updateBrother(data);
  }, null);

  const [editingDep, setEditingDep] = useState<{ id: string; name: string; relationship: string; birthdate: string | null; } | null>(null);
  const [deleteBrotherOpen, setDeleteBrotherOpen] = useState(false);
  const [dependentToDelete, setDependentToDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteBrotherFormId = `delete-brother-${brother.id}`;
  const deleteDependentFormId = `delete-dependent-${brother.id}`;

  const dependents = brother.dependents || [];

  return (
    <div>
      <form action={action} className="form">
        {state?.error && <div className="message error">{state.error}</div>}
        
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="brother_id" value={brother.id} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, padding: 16, background: "var(--page)", borderRadius: 6, border: "1px dashed var(--border)" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0" }}>Vínculo de Acesso</h4>
            <p className="subtle" style={{ margin: 0, fontSize: 13 }}>
              {brother.user_id 
                ? "Esta ficha já está vinculada a um login de usuário." 
                : brother.email 
                  ? `Ficha pronta para convite via e-mail (${brother.email}).`
                  : "Esta ficha não possui um e-mail cadastrado. Preencha o e-mail abaixo para poder enviar o convite de acesso."}
            </p>
          </div>
          {!brother.user_id ? (
            <div style={{ display: "flex", gap: 8 }}>
              {brother.email && (
                <Link
                  href={`/lojas/${storeId}/convidar?email=${encodeURIComponent(brother.email)}`}
                  className="button"
                  style={{ background: "var(--brand)", color: "#fff", gap: 6, padding: "6px 12px", fontSize: 13, textDecoration: "none" }}
                >
                  <Mail size={14} /> Enviar Convite
                </Link>
              )}
              <button 
                type="submit" 
                formAction={async (formData) => { await linkOwnUserToBrother(formData); }} 
                className="button" 
                style={{ background: "transparent", color: "var(--navy)", border: "1px solid var(--navy)", gap: 6, padding: "6px 12px", fontSize: 13 }}
              >
                <LinkIcon size={14} /> Sou eu (Vincular)
              </button>
            </div>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-dark)", fontSize: 13, fontWeight: 600 }}>
              <CheckCircle size={14} /> Vinculado
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="full_name">Nome Completo</label>
            <input id="full_name" name="full_name" type="text" required defaultValue={brother.full_name} />
          </div>

          <div className="field" style={{ flex: "0 0 200px" }}>
            <label htmlFor="cim">CIM (7 dígitos)</label>
            <input id="cim" name="cim" type="text" pattern="\d{7}" maxLength={7} title="O CIM deve conter exatamente 7 números." placeholder="Ex: 1234567" defaultValue={brother.cim || ""} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" placeholder="email@exemplo.com.br" defaultValue={brother.email || ""} />
          </div>

          <div className="field" style={{ flex: "0 0 200px" }}>
            <label htmlFor="degree">Grau</label>
            <select id="degree" name="degree" required defaultValue={brother.degree} style={{ width: "100%", height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
              <option value="Aprendiz Maçom">Aprendiz Maçom</option>
              <option value="Companheiro Maçom">Companheiro Maçom</option>
              <option value="Mestre Maçom">Mestre Maçom</option>
              <option value="Mestre Instalado">Mestre Instalado</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 200px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="office">Cargo Atual na Loja</label>
            <select id="office" name="office" defaultValue={brother.office || ""} style={{ width: "100%", height: "42px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
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

          <div className="field" style={{ flex: "0 0 140px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="phone">Celular (Opcional)</label>
            <input id="phone" name="phone" type="text" placeholder="(DD) 99999-9999" defaultValue={brother.phone || ""} style={{ height: "42px" }} />
          </div>

          <div className="field" style={{ flex: "0 0 150px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="birthdate">Data de Nasc.</label>
            <input id="birthdate" name="birthdate" type="date" defaultValue={brother.birthdate || ""} style={{ height: "42px" }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar Alterações"}
          </button>

          <button 
            type="button"
            onClick={() => setDeleteBrotherOpen(true)}
            className="subtle" 
            style={{ background: "transparent", border: "none", color: "var(--destructive)", textDecoration: "underline", cursor: "pointer", fontSize: 14 }}
          >
            Excluir Ficha
          </button>
        </div>
      </form>

      <form id={deleteBrotherFormId} action={async (formData) => { await deleteBrother(formData); }}>
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="brother_id" value={brother.id} />
      </form>

      <ConfirmDialog
        open={deleteBrotherOpen}
        onClose={() => setDeleteBrotherOpen(false)}
        title="Excluir ficha do Irmão?"
        description="A ficha e seus dados vinculados serão excluídos. Esta ação é permanente e não poderá ser desfeita."
        confirmLabel="Excluir ficha"
        formId={deleteBrotherFormId}
      />

      <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "32px 0" }} />

      <h3 style={{ marginBottom: 16 }}>Família e Dependentes</h3>
      
      {dependents.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
          {dependents.map((dep: { id: string; name: string; relationship: string; birthdate: string | null; }) => (
            <li key={dep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 8, backgroundColor: "var(--background-alt)" }}>
              <div>
                <strong>{dep.name}</strong> <span className="badge" style={{ marginLeft: 8 }}>{dep.relationship}</span>
                {dep.birthdate && <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>Nascimento: {new Date(dep.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setEditingDep(dep)} style={{ background: "transparent", border: "none", color: "var(--brand)", cursor: "pointer", padding: 4 }} title="Editar">
                  <Pencil size={16} />
                </button>
                <div>
                  <button type="button" style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 4 }} title="Remover" onClick={() => setDependentToDelete({ id: dep.id, name: dep.name })}>
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle" style={{ fontSize: 14, marginBottom: 24 }}>Nenhum familiar cadastrado.</p>
      )}

      <form id={deleteDependentFormId} action={deleteDependent}>
        <input type="hidden" name="id" value={dependentToDelete?.id ?? ""} />
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="brother_id" value={brother.id} />
      </form>

      <ConfirmDialog
        open={Boolean(dependentToDelete)}
        onClose={() => setDependentToDelete(null)}
        title="Remover familiar?"
        description={`${dependentToDelete?.name ?? "Este familiar"} será removido da ficha do Irmão. Esta ação não poderá ser desfeita.`}
        confirmLabel="Remover familiar"
        formId={deleteDependentFormId}
      />

      <form 
        action={async (formData) => {
          if (editingDep) {
            await editDependent(formData);
            setEditingDep(null);
          } else {
            await addDependent(formData);
          }
        }} 
        className="form" 
        style={{ background: editingDep ? "#fffbe6" : "var(--background-alt)", padding: 16, borderRadius: 6, border: "1px solid var(--border)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>{editingDep ? "Editar Familiar" : "Adicionar Familiar"}</h4>
          {editingDep && (
            <button type="button" onClick={() => setEditingDep(null)} className="subtle" style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>
              Cancelar Edição
            </button>
          )}
        </div>
        
        {editingDep && <input type="hidden" name="id" value={editingDep.id} />}
        <input type="hidden" name="brother_id" value={brother.id} />
        <input type="hidden" name="store_id" value={storeId} />
        
        <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <input name="name" type="text" required placeholder="Nome do familiar" defaultValue={editingDep?.name || ""} style={{ height: 38 }} key={editingDep?.id || "new-name"} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <select name="relationship" required defaultValue={editingDep?.relationship || "Esposa"} style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }} key={editingDep?.id || "new-rel"}>
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
            <input name="birthdate" type="date" placeholder="Nascimento" defaultValue={editingDep?.birthdate || ""} style={{ height: 38 }} key={editingDep?.id || "new-date"} />
          </div>
          <button className="button" type="submit" style={{ height: 38, padding: "0 16px" }}>
            {editingDep ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
