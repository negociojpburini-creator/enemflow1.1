// src/components/Questoes.jsx
//
// Módulo "Banco de Questões": lista paginada e filtrável de questões,
// favoritos, histórico de respostas do usuário e, ao responder, feedback
// completo (correta/errada, explicação passo a passo, por que cada
// alternativa está certa/errada, competência ENEM relacionada e % de
// acertos entre todos os usuários). Reutiliza o cliente Supabase, o
// AuthContext e os tokens de tema já existentes — nada duplicado.

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Heart, CheckCircle2, XCircle, Lightbulb, Clock, ChevronLeft,
  ChevronRight, X, Loader2, TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { C, S, DISCIPLINES, DISC_COLORS } from "../lib/theme";

const PAGE_SIZE = 8;

const STATUS_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "respondidas", label: "Respondidas" },
  { key: "nao_respondidas", label: "Não respondidas" },
  { key: "erradas", label: "Erradas" },
  { key: "favoritas", label: "Favoritas" },
];

function badgeStyle(bg, color) {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: bg, color,
  };
}

export default function Questoes() {
  const { user } = useAuth();

  // Filtros
  const [disciplina, setDisciplina] = useState("Todas");
  const [assunto, setAssunto] = useState("Todos");
  const [dificuldade, setDificuldade] = useState("Todas");
  const [ano, setAno] = useState("Todos");
  const [banca, setBanca] = useState("Todas");
  const [status, setStatus] = useState("todas");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  // Opções dinâmicas (assunto depende da disciplina; ano/banca vêm do banco)
  const [assuntosDisponiveis, setAssuntosDisponiveis] = useState([]);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [bancasDisponiveis, setBancasDisponiveis] = useState([]);

  // Dados do usuário (respostas + favoritos), carregados uma vez e mantidos
  // sincronizados — usados tanto para os filtros de status quanto para os
  // selos exibidos em cada card da lista.
  const [respostasMap, setRespostasMap] = useState({}); // { questao_id: { correta, alternativa_escolhida } }
  const [favoritosSet, setFavoritosSet] = useState(new Set());

  // Lista + paginação
  const [questoes, setQuestoes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  // Questão aberta em detalhe
  const [aberta, setAberta] = useState(null);

  // Debounce da busca por texto
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 400);
    return () => clearTimeout(t);
  }, [busca]);

  // Carrega opções de filtro (assuntos por disciplina, anos, bancas) e os
  // dados de resposta/favorito do usuário.
  const carregarMetadados = useCallback(async () => {
    const [assuntosRes, anosRes, bancasRes] = await Promise.all([
      supabase.from("questoes").select("subcategoria").not("subcategoria", "is", null),
      supabase.from("questoes").select("ano"),
      supabase.from("questoes").select("vestibular_origem"),
    ]);
    const assuntosTodos = (assuntosRes.data || []).map((r) => r.subcategoria).filter(Boolean);
    setAssuntosDisponiveis([...new Set(assuntosTodos)].sort());
    setAnosDisponiveis([...new Set((anosRes.data || []).map((r) => r.ano))].sort((a, b) => b - a));
    setBancasDisponiveis([...new Set((bancasRes.data || []).map((r) => r.vestibular_origem))].sort());

    if (user) {
      const [{ data: respostas }, { data: favs }] = await Promise.all([
        supabase.from("respostas_usuario_questoes").select("questao_id, correta, alternativa_escolhida").eq("user_id", user.id),
        supabase.from("favoritos").select("questao_id").eq("user_id", user.id),
      ]);
      const rMap = {};
      (respostas || []).forEach((r) => { rMap[r.questao_id] = r; });
      setRespostasMap(rMap);
      setFavoritosSet(new Set((favs || []).map((f) => f.questao_id)));
    }
  }, [user]);

  useEffect(() => { carregarMetadados(); }, [carregarMetadados]);

  // Recalcula lista de assuntos disponíveis quando a disciplina filtrada muda
  // (mantemos a lista completa carregada e filtramos client-side por
  // simplicidade — o volume de questões é pequeno o suficiente pra isso).
  const [assuntosPorDisciplina, setAssuntosPorDisciplina] = useState([]);
  useEffect(() => {
    (async () => {
      let q = supabase.from("questoes").select("subcategoria").not("subcategoria", "is", null);
      if (disciplina !== "Todas") q = q.eq("disciplina", disciplina);
      const { data } = await q;
      setAssuntosPorDisciplina([...new Set((data || []).map((r) => r.subcategoria).filter(Boolean))].sort());
    })();
  }, [disciplina]);

  // Busca a página atual de questões, aplicando todos os filtros no servidor
  const carregarQuestoes = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      let query = supabase.from("questoes").select("*", { count: "exact" });

      if (disciplina !== "Todas") query = query.eq("disciplina", disciplina);
      if (assunto !== "Todos") query = query.eq("subcategoria", assunto);
      if (dificuldade !== "Todas") query = query.eq("dificuldade", dificuldade);
      if (ano !== "Todos") query = query.eq("ano", Number(ano));
      if (banca !== "Todas") query = query.eq("vestibular_origem", banca);
      if (buscaDebounced) query = query.ilike("enunciado", `%${buscaDebounced}%`);

      // Filtros de status dependem dos dados do usuário já carregados
      if (status === "favoritas") {
        const ids = Array.from(favoritosSet);
        if (ids.length === 0) { setQuestoes([]); setTotalCount(0); setLoadingList(false); return; }
        query = query.in("id", ids);
      } else if (status === "respondidas") {
        const ids = Object.keys(respostasMap);
        if (ids.length === 0) { setQuestoes([]); setTotalCount(0); setLoadingList(false); return; }
        query = query.in("id", ids);
      } else if (status === "erradas") {
        const ids = Object.keys(respostasMap).filter((id) => !respostasMap[id].correta);
        if (ids.length === 0) { setQuestoes([]); setTotalCount(0); setLoadingList(false); return; }
        query = query.in("id", ids);
      } else if (status === "nao_respondidas") {
        const ids = Object.keys(respostasMap);
        if (ids.length > 0) query = query.not("id", "in", `(${ids.join(",")})`);
      }

      query = query.order("criado_em", { ascending: true }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setQuestoes(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setListError(err.message || "Não foi possível carregar as questões.");
    } finally {
      setLoadingList(false);
    }
  }, [disciplina, assunto, dificuldade, ano, banca, buscaDebounced, status, page, favoritosSet, respostasMap]);

  useEffect(() => { carregarQuestoes(); }, [carregarQuestoes]);

  // Volta pra primeira página sempre que um filtro muda
  useEffect(() => { setPage(0); }, [disciplina, assunto, dificuldade, ano, banca, buscaDebounced, status]);

  async function toggleFavorito(questaoId) {
    if (!user) return;
    const jaFavorito = favoritosSet.has(questaoId);
    // Atualização otimista
    setFavoritosSet((prev) => {
      const next = new Set(prev);
      if (jaFavorito) next.delete(questaoId); else next.add(questaoId);
      return next;
    });
    try {
      if (jaFavorito) {
        await supabase.from("favoritos").delete().eq("user_id", user.id).eq("questao_id", questaoId);
      } else {
        await supabase.from("favoritos").insert({ user_id: user.id, questao_id: questaoId });
      }
    } catch {
      // reverte em caso de erro
      setFavoritosSet((prev) => {
        const next = new Set(prev);
        if (jaFavorito) next.add(questaoId); else next.delete(questaoId);
        return next;
      });
    }
  }

  function onRespondida(questaoId, resultado) {
    setRespostasMap((prev) => ({ ...prev, [questaoId]: resultado }));
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Banco de questões</h1>
      <p style={{ ...S.mutedText, marginBottom: 24 }}>
        {totalCount} questão{totalCount === 1 ? "" : "ões"} encontrada{totalCount === 1 ? "" : "s"}
      </p>

      {/* Busca por texto */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} color={C.muted} style={{ position: "absolute", left: 14, top: 12 }} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por palavra no enunciado..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px",
            borderRadius: 10, border: `1px solid ${C.border}`, background: C.card,
            color: C.text, fontSize: 14,
          }}
        />
      </div>

      {/* Filtros de status */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            style={{
              padding: "7px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
              border: `1px solid ${status === f.key ? C.accent : C.border}`,
              background: status === f.key ? "rgba(88,166,255,0.12)" : "transparent",
              color: status === f.key ? C.accent : C.muted, fontWeight: 600,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros de conteúdo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
        <FilterSelect label="Disciplina" value={disciplina} onChange={setDisciplina} options={["Todas", ...DISCIPLINES]} />
        <FilterSelect label="Assunto" value={assunto} onChange={setAssunto} options={["Todos", ...assuntosPorDisciplina]} />
        <FilterSelect label="Dificuldade" value={dificuldade} onChange={setDificuldade} options={["Todas", "Baixa", "Media", "Alta"]} />
        <FilterSelect label="Ano" value={ano} onChange={setAno} options={["Todos", ...anosDisponiveis]} />
        <FilterSelect label="Banca" value={banca} onChange={setBanca} options={["Todas", ...bancasDisponiveis]} />
      </div>

      {/* Lista */}
      {loadingList ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : listError ? (
        <p style={{ color: C.danger }}>{listError}</p>
      ) : questoes.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48 }}>
          <p style={{ ...S.mutedText, margin: 0 }}>Nenhuma questão encontrada com esses filtros.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questoes.map((q) => {
            const resposta = respostasMap[q.id];
            const favorita = favoritosSet.has(q.id);
            return (
              <div
                key={q.id}
                onClick={() => setAberta(q)}
                style={{
                  ...S.card, cursor: "pointer", display: "flex", gap: 16, alignItems: "flex-start",
                  transition: "border-color .15s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={badgeStyle("rgba(88,166,255,0.14)", C.accent)}>{q.disciplina}</span>
                    {q.subcategoria && <span style={badgeStyle("rgba(139,148,158,0.14)", C.muted)}>{q.subcategoria}</span>}
                    <span style={badgeStyle("rgba(210,168,255,0.14)", C.warn)}>{q.dificuldade}</span>
                    {resposta && (
                      resposta.correta
                        ? <span style={badgeStyle("rgba(52,208,88,0.14)", C.success)}><CheckCircle2 size={11} /> Acertou</span>
                        : <span style={badgeStyle("rgba(248,81,73,0.14)", C.danger)}><XCircle size={11} /> Errou</span>
                    )}
                  </div>
                  <p style={{
                    margin: 0, fontSize: 14, lineHeight: 1.5, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {q.enunciado}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorito(q.id); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, padding: 4 }}
                  title={favorita ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart size={18} color={favorita ? C.danger : C.muted} fill={favorita ? C.danger : "none"} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {!loadingList && questoes.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 20 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...S.btnGhost, padding: 8, opacity: page === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ ...S.mutedText }}>Página {page + 1} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ ...S.btnGhost, padding: 8, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {aberta && (
        <QuestaoDetalhe
          questao={aberta}
          userId={user?.id}
          respostaExistente={respostasMap[aberta.id]}
          favorita={favoritosSet.has(aberta.id)}
          onToggleFavorito={() => toggleFavorito(aberta.id)}
          onRespondida={onRespondida}
          onClose={() => setAberta(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      style={{
        background: C.card, color: C.text, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "8px 8px", fontSize: 12, minWidth: 0,
      }}
    >
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Modal de detalhe: responder + feedback completo
// ---------------------------------------------------------------------------
function QuestaoDetalhe({ questao, userId, respostaExistente, favorita, onToggleFavorito, onRespondida, onClose }) {
  const [selecionada, setSelecionada] = useState(respostaExistente?.alternativa_escolhida || null);
  const [enviando, setEnviando] = useState(false);
  const [respondeuAgora, setRespondeuAgora] = useState(!!respostaExistente);
  const [erro, setErro] = useState(null);
  const [stats, setStats] = useState(null);
  const startRef = React.useRef(Date.now());

  useEffect(() => {
    supabase.rpc("obter_estatisticas_questao", { p_questao_id: questao.id })
      .then(({ data }) => { if (data && data[0]) setStats(data[0]); })
      .catch(() => {});
  }, [questao.id]);

  async function enviarResposta() {
    if (!selecionada || !userId) return;
    setEnviando(true);
    setErro(null);
    const correta = selecionada === questao.resposta_correta;
    const tempoGasto = Math.round((Date.now() - startRef.current) / 1000);
    try {
      const { error } = await supabase.from("respostas_usuario_questoes").upsert(
        { user_id: userId, questao_id: questao.id, alternativa_escolhida: selecionada, correta, tempo_gasto_segundos: tempoGasto },
        { onConflict: "user_id,questao_id" }
      );
      if (error) throw error;
      onRespondida(questao.id, { correta, alternativa_escolhida: selecionada });
      setRespondeuAgora(true);
      // Atualiza a estatística global exibida
      supabase.rpc("obter_estatisticas_questao", { p_questao_id: questao.id })
        .then(({ data }) => { if (data && data[0]) setStats(data[0]); })
        .catch(() => {});
    } catch (err) {
      setErro(err.message || "Não foi possível salvar sua resposta.");
    } finally {
      setEnviando(false);
    }
  }

  const alternativas = { A: questao.alternativa_a, B: questao.alternativa_b, C: questao.alternativa_c, D: questao.alternativa_d, E: questao.alternativa_e };
  const explicacoesAlt = questao.explicacao_alternativas || {};
  const acertou = selecionada === questao.resposta_correta;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 60,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", padding: "40px 20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...S.card, maxWidth: 680, width: "100%", position: "relative" }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <X size={20} color={C.muted} />
        </button>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, paddingRight: 30 }}>
          <span style={badgeStyle("rgba(88,166,255,0.14)", C.accent)}>{questao.disciplina}</span>
          {questao.subcategoria && <span style={badgeStyle("rgba(139,148,158,0.14)", C.muted)}>{questao.subcategoria}</span>}
          <span style={badgeStyle("rgba(210,168,255,0.14)", C.warn)}>{questao.dificuldade}</span>
          <span style={badgeStyle("rgba(139,148,158,0.14)", C.muted)}>{questao.vestibular_origem} {questao.ano}</span>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>{questao.enunciado}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {Object.entries(alternativas).map(([letra, texto]) => {
            const isSelected = selecionada === letra;
            const isCorrect = letra === questao.resposta_correta;
            let border = C.border, bg = "transparent";
            if (respondeuAgora) {
              if (isCorrect) { border = C.success; bg = "rgba(52,208,88,0.1)"; }
              else if (isSelected && !isCorrect) { border = C.danger; bg = "rgba(248,81,73,0.1)"; }
            } else if (isSelected) {
              border = C.accent; bg = "rgba(88,166,255,0.1)";
            }
            return (
              <button
                key={letra}
                disabled={respondeuAgora}
                onClick={() => setSelecionada(letra)}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left",
                  padding: "12px 14px", borderRadius: 10, cursor: respondeuAgora ? "default" : "pointer",
                  border: `1.5px solid ${border}`, background: bg, color: C.text, fontSize: 14,
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{letra}</span>
                <span style={{ flex: 1 }}>{texto}</span>
                {respondeuAgora && isCorrect && <CheckCircle2 size={16} color={C.success} />}
                {respondeuAgora && isSelected && !isCorrect && <XCircle size={16} color={C.danger} />}
              </button>
            );
          })}
        </div>

        {erro && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        {!respondeuAgora ? (
          <button
            disabled={!selecionada || enviando}
            onClick={enviarResposta}
            style={S.btnPrimary(!selecionada || enviando)}
          >
            {enviando ? "Enviando..." : "Responder"}
          </button>
        ) : (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 4 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
              color: acertou ? C.success : C.danger, fontWeight: 700, fontSize: 15,
            }}>
              {acertou ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {acertou ? "Você acertou!" : "Você errou."} A alternativa correta é a {questao.resposta_correta}.
            </div>

            {questao.explicacao && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 4 }}>Explicação</p>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{questao.explicacao}</p>
              </div>
            )}

            {Object.keys(explicacoesAlt).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 6 }}>Por que cada alternativa está certa ou errada</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(explicacoesAlt).map(([letra, texto]) => (
                    <p key={letra} style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: letra === questao.resposta_correta ? C.success : C.muted }}>
                      <strong>{letra}:</strong> {texto}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {questao.dicas && (
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 8,
                background: "rgba(210,168,255,0.08)", marginBottom: 14,
              }}>
                <Lightbulb size={16} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{questao.dicas}</p>
              </div>
            )}

            {questao.competencias_avaliadas?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 6 }}>Competências ENEM relacionadas</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {questao.competencias_avaliadas.map((c, i) => (
                    <span key={i} style={badgeStyle("rgba(88,166,255,0.1)", C.accent)}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              {stats && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...S.mutedText }}>
                  <TrendingUp size={14} />
                  {stats.percentual_acertos}% de acerto ({stats.total_respostas} resposta{stats.total_respostas === 1 ? "" : "s"})
                </div>
              )}
              {questao.tempo_medio_segundos && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...S.mutedText }}>
                  <Clock size={14} /> ~{questao.tempo_medio_segundos}s em média
                </div>
              )}
              <button
                onClick={onToggleFavorito}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", ...S.mutedText, marginLeft: "auto" }}
              >
                <Heart size={14} color={favorita ? C.danger : C.muted} fill={favorita ? C.danger : "none"} />
                {favorita ? "Favoritada" : "Favoritar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
