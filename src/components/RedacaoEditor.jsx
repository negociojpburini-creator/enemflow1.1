// src/components/RedacaoEditor.jsx
//
// Editor de redação completo: cronômetro (30/60/90 min), contador de
// palavras/caracteres, salvamento automático, histórico de redações do
// usuário, seleção de tema (do banco redacoes_temas) e envio para correção
// por IA nas 5 competências do ENEM (via /api/corrigir-redacao, que mantém
// a chave da API no servidor). Reutiliza supabaseClient, AuthContext e os
// tokens de tema já existentes.

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, Save, Send, FileText, Plus, ChevronLeft, CheckCircle2,
  AlertTriangle, TrendingUp, TrendingDown, Lightbulb, Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { C, S } from "../lib/theme";

const DURACOES = [
  { label: "30 min", minutos: 30 },
  { label: "60 min", minutos: 60 },
  { label: "90 min", minutos: 90 },
  { label: "Sem cronômetro", minutos: null },
];

function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const COMPETENCIAS_LABELS = [
  "Domínio da norma culta",
  "Compreensão da proposta",
  "Organização de argumentos",
  "Coesão textual",
  "Proposta de intervenção",
];

export default function RedacaoEditor() {
  const { user } = useAuth();
  const [view, setView] = useState("lista"); // 'lista' | 'novo' | 'editor'
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [temas, setTemas] = useState([]);

  const carregarHistorico = useCallback(async () => {
    if (!user) return;
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("redacoes_usuario")
      .select("*")
      .eq("user_id", user.id)
      .order("atualizado_em", { ascending: false });
    setHistorico(data || []);
    setLoadingHistorico(false);
  }, [user]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  useEffect(() => {
    supabase.from("redacoes_temas").select("*").order("ano", { ascending: false })
      .then(({ data }) => setTemas(data || []));
  }, []);

  const [redacaoAtiva, setRedacaoAtiva] = useState(null);

  function abrirNova() {
    setRedacaoAtiva(null);
    setView("novo");
  }

  function abrirExistente(r) {
    setRedacaoAtiva(r);
    setView("editor");
  }

  function voltarLista() {
    setView("lista");
    setRedacaoAtiva(null);
    carregarHistorico();
  }

  if (view === "lista") {
    return (
      <ListaRedacoes
        historico={historico}
        loading={loadingHistorico}
        onNova={abrirNova}
        onAbrir={abrirExistente}
      />
    );
  }

  if (view === "novo") {
    return (
      <NovaRedacao
        temas={temas}
        userId={user?.id}
        onCriada={(r) => { setRedacaoAtiva(r); setView("editor"); }}
        onCancelar={voltarLista}
      />
    );
  }

  return <Editor redacao={redacaoAtiva} onVoltar={voltarLista} />;
}

// ---------------------------------------------------------------------------
// Lista / histórico
// ---------------------------------------------------------------------------
function ListaRedacoes({ historico, loading, onNova, onAbrir }) {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Redações</h1>
          <p style={{ ...S.mutedText, margin: "4px 0 0" }}>Editor, cronômetro e correção por IA</p>
        </div>
        <button
          onClick={onNova}
          style={{ ...S.btnPrimary(false), display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} /> Nova redação
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : historico.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48 }}>
          <FileText size={36} color={C.muted} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px" }}>Nenhuma redação ainda</h3>
          <p style={{ ...S.mutedText, marginBottom: 20 }}>Comece sua primeira redação com cronômetro e correção por IA.</p>
          <button onClick={onNova} style={S.btnPrimary(false)}>Escrever agora</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {historico.map((r) => (
            <div
              key={r.id}
              onClick={() => onAbrir(r)}
              style={{ ...S.card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 15 }}>
                  {r.titulo || "Redação sem título"}
                </p>
                <p style={{ ...S.mutedText, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(r.texto || "").slice(0, 90) || "Sem conteúdo ainda"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <StatusBadge status={r.status} nota={r.nota_total} />
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatusBadge({ status, nota }) {
  if (status === "corrigida") {
    return (
      <span style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999,
        background: "rgba(52,208,88,0.14)", color: C.success, fontWeight: 700, fontSize: 13,
      }}>
        <CheckCircle2 size={13} /> {nota}/1000
      </span>
    );
  }
  if (status === "enviada") {
    return (
      <span style={{ padding: "5px 12px", borderRadius: 999, background: "rgba(210,168,255,0.14)", color: C.warn, fontWeight: 700, fontSize: 12 }}>
        Corrigindo...
      </span>
    );
  }
  return (
    <span style={{ padding: "5px 12px", borderRadius: 999, background: "rgba(139,148,158,0.14)", color: C.muted, fontWeight: 600, fontSize: 12 }}>
      Rascunho
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tela de criação: escolher tema + duração do cronômetro
// ---------------------------------------------------------------------------
function NovaRedacao({ temas, userId, onCriada, onCancelar }) {
  const [temaId, setTemaId] = useState("livre");
  const [duracao, setDuracao] = useState(60);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);

  async function criar() {
    setCriando(true);
    setErro(null);
    const temaEscolhido = temas.find((t) => t.id === temaId);
    try {
      const { data, error } = await supabase.from("redacoes_usuario").insert({
        user_id: userId,
        tema_id: temaId === "livre" ? null : temaId,
        titulo: temaEscolhido ? temaEscolhido.tema : "Tema livre",
        texto: "",
        status: "rascunho",
        tempo_limite_minutos: duracao,
      }).select().single();
      if (error) throw error;
      onCriada(data);
    } catch (err) {
      setErro(err.message || "Não foi possível criar a redação.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: "0 auto" }}>
      <button onClick={onCancelar} style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        <ChevronLeft size={16} /> Voltar
      </button>
      <div style={S.card}>
        <h2 style={{ marginTop: 0 }}>Nova redação</h2>

        <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 8 }}>Tema</p>
        <select
          value={temaId}
          onChange={(e) => setTemaId(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9,
            border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, marginBottom: 20,
          }}
        >
          <option value="livre">Tema livre (escolho depois)</option>
          {temas.map((t) => <option key={t.id} value={t.id}>{t.ano} — {t.tema}</option>)}
        </select>

        <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 8 }}>Cronômetro</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          {DURACOES.map((d) => (
            <button
              key={d.label}
              onClick={() => setDuracao(d.minutos)}
              style={{
                padding: "10px 6px", borderRadius: 9, fontSize: 13, cursor: "pointer",
                border: `1.5px solid ${duracao === d.minutos ? C.accent : C.border}`,
                background: duracao === d.minutos ? "rgba(88,166,255,0.12)" : "transparent",
                color: duracao === d.minutos ? C.accent : C.text, fontWeight: 600,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {erro && <p style={{ color: C.danger, fontSize: 13, marginBottom: 14 }}>{erro}</p>}

        <button disabled={criando} onClick={criar} style={{ ...S.btnPrimary(criando), width: "100%" }}>
          {criando ? "Criando..." : "Começar a escrever"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor propriamente dito
// ---------------------------------------------------------------------------
const AUTOSAVE_DELAY_MS = 2500;

function Editor({ redacao, onVoltar }) {
  const [titulo, setTitulo] = useState(redacao.titulo || "");
  const [texto, setTexto] = useState(redacao.texto || "");
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState(redacao.atualizado_em ? new Date(redacao.atualizado_em) : null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [erroCorrecao, setErroCorrecao] = useState(null);
  const [resultado, setResultado] = useState(
    redacao.status === "corrigida"
      ? {
          competencia_1: redacao.competencia_1, competencia_2: redacao.competencia_2,
          competencia_3: redacao.competencia_3, competencia_4: redacao.competencia_4,
          competencia_5: redacao.competencia_5, nota_total: redacao.nota_total,
          feedback_geral: redacao.feedback_ia, pontos_fortes: redacao.pontos_fortes,
          pontos_fracos: redacao.pontos_fracos,
        }
      : null
  );

  const [timeLeft, setTimeLeft] = useState(redacao.tempo_limite_minutos ? redacao.tempo_limite_minutos * 60 : null);
  const [timerRunning, setTimerRunning] = useState(!!redacao.tempo_limite_minutos && redacao.status === "rascunho");
  const startRef = useRef(Date.now());

  const saveTimeoutRef = useRef(null);
  const redacaoIdRef = useRef(redacao.id);

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const caracteres = texto.length;

  const salvar = useCallback(async (novoTitulo, novoTexto) => {
    setSalvando(true);
    try {
      const tempoGasto = Math.round((Date.now() - startRef.current) / 1000);
      const { error } = await supabase
        .from("redacoes_usuario")
        .update({ titulo: novoTitulo, texto: novoTexto, tempo_gasto_segundos: tempoGasto })
        .eq("id", redacaoIdRef.current);
      if (!error) setUltimoSalvo(new Date());
    } finally {
      setSalvando(false);
    }
  }, []);

  // Autosave com debounce
  useEffect(() => {
    if (resultado) return; // já corrigida, não precisa mais salvar
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => { salvar(titulo, texto); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, texto]);

  // Cronômetro
  useEffect(() => {
    if (!timerRunning || timeLeft === null) return;
    if (timeLeft <= 0) { setTimerRunning(false); return; }
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timerRunning, timeLeft]);

  async function enviarParaCorrecao() {
    if (texto.trim().length < 50) {
      setErroCorrecao("Escreva pelo menos 50 caracteres antes de enviar para correção.");
      return;
    }
    setCorrigindo(true);
    setErroCorrecao(null);
    try {
      await salvar(titulo, texto);
      await supabase.from("redacoes_usuario").update({ status: "enviada" }).eq("id", redacaoIdRef.current);

      const res = await fetch("/api/corrigir-redacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, tema: titulo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao corrigir.");

      await supabase.from("redacoes_usuario").update({
        status: "corrigida",
        competencia_1: data.competencia_1, competencia_2: data.competencia_2,
        competencia_3: data.competencia_3, competencia_4: data.competencia_4,
        competencia_5: data.competencia_5, nota_total: data.nota_total,
        feedback_ia: data.feedback_geral, pontos_fortes: data.pontos_fortes,
        pontos_fracos: data.pontos_fracos,
      }).eq("id", redacaoIdRef.current);

      setResultado(data);
      setTimerRunning(false);
    } catch (err) {
      setErroCorrecao(err.message || "Não foi possível corrigir agora. Tente novamente.");
      await supabase.from("redacoes_usuario").update({ status: "rascunho" }).eq("id", redacaoIdRef.current);
    } finally {
      setCorrigindo(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={onVoltar} style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft size={16} /> Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {timeLeft !== null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontWeight: 700, fontSize: 16,
              color: timeLeft < 300 ? C.danger : C.accent,
            }}>
              <Clock size={16} /> {fmtTime(timeLeft)}
            </div>
          )}
          <span style={{ ...S.mutedText, display: "flex", alignItems: "center", gap: 4 }}>
            <Save size={13} />
            {salvando ? "Salvando..." : ultimoSalvo ? `Salvo às ${ultimoSalvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ainda não salvo"}
          </span>
        </div>
      </div>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        disabled={!!resultado}
        placeholder="Título ou tema da redação"
        style={{
          width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.card, color: C.text,
          fontSize: 16, fontWeight: 700, marginBottom: 12,
        }}
      />

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={!!resultado}
        placeholder="Comece a escrever sua redação aqui..."
        style={{
          width: "100%", boxSizing: "border-box", minHeight: 420, padding: 18, borderRadius: 12,
          border: `1px solid ${C.border}`, background: C.card, color: C.text,
          fontSize: 15, lineHeight: 1.8, fontFamily: "Georgia, serif", resize: "vertical",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 16, ...S.mutedText }}>
          <span>{palavras} palavras</span>
          <span>{caracteres} caracteres</span>
        </div>
        {!resultado && (
          <button
            disabled={corrigindo}
            onClick={enviarParaCorrecao}
            style={{ ...S.btnPrimary(corrigindo), display: "flex", alignItems: "center", gap: 8 }}
          >
            {corrigindo ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Corrigindo...</> : <><Send size={15} /> Enviar para correção</>}
          </button>
        )}
      </div>

      {erroCorrecao && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 8, background: "rgba(248,81,73,0.1)", marginTop: 14 }}>
          <AlertTriangle size={16} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: C.danger }}>{erroCorrecao}</p>
        </div>
      )}

      {resultado && <ResultadoCorrecao resultado={resultado} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultadoCorrecao({ resultado }) {
  const competencias = [
    resultado.competencia_1, resultado.competencia_2, resultado.competencia_3,
    resultado.competencia_4, resultado.competencia_5,
  ];

  return (
    <div style={{ ...S.card, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Resultado da correção</h2>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.accent }}>{resultado.nota_total}<span style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>/1000</span></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {competencias.map((nota, i) => (
          <div key={i} style={{ textAlign: "center", padding: 12, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.warn }}>{nota}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>C{i + 1}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{COMPETENCIAS_LABELS[i]}</div>
          </div>
        ))}
      </div>

      {resultado.feedback_geral && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 6 }}>Comentário geral</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{resultado.feedback_geral}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {resultado.pontos_fortes && (
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: 6, color: C.success, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              <TrendingUp size={14} /> Pontos fortes
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: C.muted }}>{resultado.pontos_fortes}</p>
          </div>
        )}
        {resultado.pontos_fracos && (
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: 6, color: C.danger, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              <TrendingDown size={14} /> Pontos a melhorar
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: C.muted }}>{resultado.pontos_fracos}</p>
          </div>
        )}
      </div>

      {resultado.sugestoes && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 8, background: "rgba(210,168,255,0.08)" }}>
          <Lightbulb size={16} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{resultado.sugestoes}</p>
        </div>
      )}
    </div>
  );
}