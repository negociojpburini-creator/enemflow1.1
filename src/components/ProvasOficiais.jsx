// src/components/ProvasOficiais.jsx
//
// Módulo "Provas": lista as últimas 10 edições do ENEM, cada uma com acesso
// direto à prova e ao gabarito oficiais (PDFs hospedados no próprio INEP).
// Não reproduz nenhum conteúdo de prova — só organiza os links oficiais já
// gravados na tabela provas_completas. Reutiliza supabaseClient e os
// tokens de tema já existentes.

import React, { useState, useEffect } from "react";
import { FileText, CheckSquare, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, S } from "../lib/theme";

export default function ProvasOficiais() {
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    supabase
      .from("provas_completas")
      .select("*")
      .order("ano", { ascending: false })
      .order("dia", { ascending: true })
      .then(({ data }) => {
        setProvas(data || []);
        setLoading(false);
      });
  }, []);

  // Agrupa os dois dias de cada ano numa mesma linha
  const porAno = {};
  provas.forEach((p) => {
    porAno[p.ano] = porAno[p.ano] || [];
    porAno[p.ano].push(p);
  });
  const anos = Object.keys(porAno).sort((a, b) => b - a);

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Provas oficiais do ENEM</h1>
      <p style={{ ...S.mutedText, marginBottom: 24 }}>
        As últimas {anos.length} edições, com acesso direto à prova e ao gabarito oficiais do INEP.
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : anos.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <p style={{ ...S.mutedText, margin: 0 }}>Nenhuma prova cadastrada ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {anos.map((ano) => {
            const isOpen = expandido === ano;
            const dias = porAno[ano].sort((a, b) => a.dia - b.dia);
            return (
              <div key={ano} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandido(isOpen ? null : ano)}
                  style={{
                    width: "100%", background: "transparent", border: "none", cursor: "pointer",
                    padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
                    color: C.text, textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 16 }}>ENEM {ano}</span>
                  <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                    {dias.map((p) => (
                      <div key={p.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "14px 0", borderBottom: p.dia === 1 ? `1px solid ${C.border}` : "none",
                        flexWrap: "wrap", gap: 10,
                      }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Dia {p.dia}</p>
                          <p style={{ ...S.mutedText, margin: "2px 0 0", fontSize: 12 }}>{p.area}</p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <LinkBotao href={p.link_pdf_oficial} icon={FileText} label="Prova" />
                          <LinkBotao href={p.link_gabarito_pdf} icon={CheckSquare} label="Gabarito" />
                        </div>
                      </div>
                    ))}
                    <p style={{ ...S.mutedText, fontSize: 11, marginTop: 4 }}>
                      Arquivos oficiais hospedados pelo INEP (download.inep.gov.br). Se algum link estiver fora do ar,
                      consulte a página oficial:{" "}
                      <a
                        href={`https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/${ano}`}
                        target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}
                      >
                        gov.br/inep · ENEM {ano}
                      </a>.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LinkBotao({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
        border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontWeight: 600,
        textDecoration: "none",
      }}
    >
      <Icon size={13} /> {label} <ExternalLink size={11} color={C.muted} />
    </a>
  );
}