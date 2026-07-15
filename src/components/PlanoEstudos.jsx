// src/components/PlanoEstudos.jsx
//
// Módulo "Plano de Estudos": gera automaticamente um plano (diário/semanal/
// mensal) a partir do onboarding + desempenho real (simulados + banco de
// questões), e reorganiza sozinho os itens atrasados. A decisão de COMO
// montar/reorganizar o plano vive em src/lib/planoEstudosEngine.js (funções
// puras, testáveis) — este arquivo só cuida de buscar dados, chamar o motor
// e renderizar. Reutiliza supabaseClient, AuthContext e os tokens de tema.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar, CalendarDays, CalendarRange, RefreshCw, Sparkles, CheckCircle2,
  Circle, BookOpen, PenTool, RotateCcw, Loader2, TrendingUp, Clock,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { C, S, DISCIPLINES, DISC_COLORS } from "../lib/theme";
import {
  DIAS_SEMANA_LABELS, sugerirDiasSemana, sugerirMetaQuestoesPorSessao,
  ordenarDisciplinasPorDesempenho, gerarPlanoAutomatico, reorganizarItensAtrasados,
} from "../lib/planoEstudosEngine";

function toISODate(d) { return d.toISOString().slice(0, 10); }
function hojeISO() { return toISODate(new Date()); }

const TIPO_ICON = { questoes: BookOpen, redacao: PenTool, revisao: RotateCcw, simulado: Sparkles };
const TIPO_LABEL = { questoes: "Questões", redacao: "Redação", revisao: "Revisão geral", simulado: "Simulado" };

export default function PlanoEstudos() {
  const { user, profile } = useAuth();
  const [plano, setPlano] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorganizando, setReorganizando] = useState(false);
  const [view, setView] = useState("dia"); // 'dia' | 'semana' | 'mes'
  const [diaSelecionado, setDiaSelecionado] = useState(hojeISO());
  const [mesReferencia, setMesReferencia] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const carregarPlanoAtivo = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: planoAtivo } = await supabase
      .from("planos_estudo").select("*")
      .eq("user_id", user.id).eq("ativo", true)
      .order("criado_em", { ascending: false }).limit(1).maybeSingle();

    if (!planoAtivo) {
      setPlano(null);
      setItens([]);
      setLoading(false);
      return;
    }
    setPlano(planoAtivo);

    const { data: itensDoPlano } = await supabase
      .from("plano_estudo_itens").select("*")
      .eq("plano_id", planoAtivo.id)
      .order("data", { ascending: true });

    setItens(itensDoPlano || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { carregarPlanoAtivo(); }, [carregarPlanoAtivo]);

  // Reorganização automática: roda sozinha assim que o plano carrega, se
  // houver item atrasado (data passada e não concluído).
  useEffect(() => {
    if (!plano || itens.length === 0) return;
    const hoje = hojeISO();
    const atrasados = itens.filter((i) => !i.concluido && i.data && i.data < hoje);
    if (atrasados.length === 0) return;

    (async () => {
      setReorganizando(true);
      const reorganizados = reorganizarItensAtrasados({
        itensAtrasados: atrasados,
        diasSemana: plano.dias_semana || [1, 2, 3, 4, 5],
        hoje: new Date(),
      });
      await Promise.all(reorganizados.map((item) =>
        supabase.from("plano_estudo_itens")
          .update({ data: item.data, data_original: item.data_original, reorganizado: true })
          .eq("id", item.id)
      ));
      await supabase.from("planos_estudo").update({ ultima_reorganizacao: new Date().toISOString() }).eq("id", plano.id);
      await carregarPlanoAtivo();
      setReorganizando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano?.id, itens.length]);

  async function toggleConcluido(item) {
    const novoValor = !item.concluido;
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, concluido: novoValor } : i));
    await supabase.from("plano_estudo_itens")
      .update({ concluido: novoValor, concluido_em: novoValor ? new Date().toISOString() : null })
      .eq("id", item.id);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Loader2 size={24} color={C.muted} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!plano) {
    return <GerarPlano userId={user?.id} profile={profile} onGerado={carregarPlanoAtivo} />;
  }

  const totalItens = itens.length;
  const totalConcluidos = itens.filter((i) => i.concluido).length;
  const pctConcluido = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Plano de estudos</h1>
          <p style={{ ...S.mutedText, margin: "4px 0 0" }}>
            {totalConcluidos}/{totalItens} sessões concluídas ({pctConcluido}%)
            {reorganizando && <span style={{ color: C.warn, marginLeft: 10 }}>· reorganizando itens atrasados...</span>}
          </p>
        </div>
        <GerarNovoPlanoBotao userId={user?.id} profile={profile} onGerado={carregarPlanoAtivo} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "dia", label: "Hoje", icon: Calendar },
          { key: "semana", label: "Semana", icon: CalendarDays },
          { key: "mes", label: "Mês", icon: CalendarRange },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${view === t.key ? C.accent : C.border}`,
              background: view === t.key ? "rgba(88,166,255,0.12)" : "transparent",
              color: view === t.key ? C.accent : C.text, fontWeight: 600, fontSize: 14,
            }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {view === "dia" && <VisaoDia itens={itens} data={hojeISO()} onToggle={toggleConcluido} />}
      {view === "semana" && <VisaoSemana itens={itens} onToggle={toggleConcluido} />}
      {view === "mes" && (
        <VisaoMes
          itens={itens} mesReferencia={mesReferencia} setMesReferencia={setMesReferencia}
          diaSelecionado={diaSelecionado} setDiaSelecionado={setDiaSelecionado} onToggle={toggleConcluido}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geração do plano (primeira vez / novo plano)
// ---------------------------------------------------------------------------
function useDesempenhoPorDisciplina(userId) {
  const [desempenho, setDesempenho] = useState(null);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const acumulado = {};
      const soma = (disc, acertos, total) => {
        if (!disc) return;
        acumulado[disc] = acumulado[disc] || { acertos: 0, total: 0 };
        acumulado[disc].acertos += acertos;
        acumulado[disc].total += total;
      };

      const { data: simulados } = await supabase
        .from("simulados_historico").select("por_disciplina").eq("user_id", userId);
      (simulados || []).forEach((s) => {
        Object.entries(s.por_disciplina || {}).forEach(([disc, v]) => {
          soma(disc, v.acertos || 0, (v.acertos || 0) + (v.erros || 0));
        });
      });

      const { data: respostas } = await supabase
        .from("respostas_usuario_questoes").select("correta, questoes(disciplina)").eq("user_id", userId);
      (respostas || []).forEach((r) => {
        soma(r.questoes?.disciplina, r.correta ? 1 : 0, 1);
      });

      const resultado = {};
      Object.entries(acumulado).forEach(([disc, v]) => {
        resultado[disc] = { ...v, pct: v.total > 0 ? v.acertos / v.total : null };
      });
      setDesempenho(resultado);
    })();
  }, [userId]);
  return desempenho;
}

function GerarPlano({ userId, profile, onGerado }) {
  return (
    <div style={{ padding: 32, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
        <Sparkles size={36} color={C.accent} style={{ marginBottom: 12 }} />
        <h2 style={{ margin: "0 0 8px" }}>Monte seu plano de estudos</h2>
        <p style={{ ...S.mutedText, marginBottom: 24 }}>
          Vamos gerar um plano automático com base no seu diagnóstico e no seu desempenho real
          (simulados e banco de questões), dando mais peso às disciplinas onde você mais precisa evoluir.
        </p>
        <ConfiguradorDePlano userId={userId} profile={profile} onGerado={onGerado} />
      </div>
    </div>
  );
}

function GerarNovoPlanoBotao({ userId, profile, onGerado }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: 6 }}>
        <RefreshCw size={14} /> Gerar novo plano
      </button>
    );
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setAberto(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...S.card, maxWidth: 480, width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>Gerar novo plano</h3>
        <p style={{ ...S.mutedText, marginBottom: 20 }}>Isso substitui o plano atual por um novo, recalculado com seu desempenho mais recente.</p>
        <ConfiguradorDePlano userId={userId} profile={profile} onGerado={() => { setAberto(false); onGerado(); }} />
      </div>
    </div>
  );
}

function ConfiguradorDePlano({ userId, profile, onGerado }) {
  const desempenho = useDesempenhoPorDisciplina(userId);
  const [diasSemana, setDiasSemana] = useState(() => sugerirDiasSemana(profile?.tempo));
  const [semanas, setSemanas] = useState(4);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  function toggleDia(d) {
    setDiasSemana((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  async function gerar() {
    if (diasSemana.length === 0) { setErro("Escolha pelo menos um dia da semana."); return; }
    setGerando(true);
    setErro(null);
    try {
      const disciplinasOrdenadas = ordenarDisciplinasPorDesempenho(desempenho || {}, DISCIPLINES);
      const metaQuestoesPorSessao = sugerirMetaQuestoesPorSessao(profile?.tempo);

      // Desativa qualquer plano anterior ainda marcado como ativo
      await supabase.from("planos_estudo").update({ ativo: false }).eq("user_id", userId).eq("ativo", true);

      const dataInicio = new Date();
      const dataFim = new Date(dataInicio); dataFim.setDate(dataFim.getDate() + semanas * 7);
      const { data: novoPlano, error: planoError } = await supabase.from("planos_estudo").insert({
        user_id: userId,
        titulo: `Plano automático — ${semanas} semana${semanas > 1 ? "s" : ""}`,
        descricao: `Gerado a partir do diagnóstico e desempenho em ${new Date().toLocaleDateString("pt-BR")}.`,
        data_inicio: toISODate(dataInicio), data_fim: toISODate(dataFim),
        ativo: true, disciplinas_foco: disciplinasOrdenadas.slice(0, 3),
        dias_semana: diasSemana, horas_por_dia: profile?.tempo === "Mais de 4h" ? 4 : profile?.tempo === "2h a 4h" ? 3 : 1.5,
        gerado_automaticamente: true,
      }).select().single();
      if (planoError) throw planoError;

      const itensGerados = gerarPlanoAutomatico({ disciplinasOrdenadas, diasSemana, semanas, dataInicio, metaQuestoesPorSessao });
      const linhas = itensGerados.map((item) => ({
        plano_id: novoPlano.id, user_id: userId,
        disciplina: item.disciplina, descricao: item.descricao, tipo: item.tipo,
        prioridade: item.prioridade, meta_quantidade: item.meta_quantidade,
        data: item.data, concluido: false,
      }));
      const { error: itensError } = await supabase.from("plano_estudo_itens").insert(linhas);
      if (itensError) throw itensError;

      onGerado();
    } catch (err) {
      setErro(err.message || "Não foi possível gerar o plano.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ textAlign: "left" }}>
      <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 8 }}>Dias da semana</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {DIAS_SEMANA_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => toggleDia(i)}
            style={{
              width: 42, height: 42, borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${diasSemana.includes(i) ? C.accent : C.border}`,
              background: diasSemana.includes(i) ? "rgba(88,166,255,0.12)" : "transparent",
              color: diasSemana.includes(i) ? C.accent : C.muted,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 8 }}>Duração</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        {[{ l: "1 semana", v: 1 }, { l: "2 semanas", v: 2 }, { l: "1 mês", v: 4 }].map((op) => (
          <button
            key={op.v}
            onClick={() => setSemanas(op.v)}
            style={{
              padding: "10px 6px", borderRadius: 9, fontSize: 13, cursor: "pointer",
              border: `1.5px solid ${semanas === op.v ? C.accent : C.border}`,
              background: semanas === op.v ? "rgba(88,166,255,0.12)" : "transparent",
              color: semanas === op.v ? C.accent : C.text, fontWeight: 600,
            }}
          >
            {op.l}
          </button>
        ))}
      </div>

      {desempenho === null ? (
        <p style={{ ...S.mutedText, marginBottom: 16 }}>Analisando seu desempenho...</p>
      ) : (
        <p style={{ ...S.mutedText, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={13} />
          {Object.keys(desempenho).length > 0
            ? "O plano vai priorizar as disciplinas onde você mais erra até agora."
            : "Sem histórico ainda — o plano começa equilibrado entre todas as disciplinas."}
        </p>
      )}

      {erro && <p style={{ color: C.danger, fontSize: 13, marginBottom: 14 }}>{erro}</p>}

      <button disabled={gerando} onClick={gerar} style={{ ...S.btnPrimary(gerando), width: "100%" }}>
        {gerando ? "Gerando..." : "Gerar plano automático"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linha de item (reutilizada nas 3 visões)
// ---------------------------------------------------------------------------
function ItemLinha({ item, onToggle, mostrarData }) {
  const Icon = TIPO_ICON[item.tipo] || BookOpen;
  const corDisciplina = item.disciplina ? (DISC_COLORS[item.disciplina] || C.muted) : C.warn;
  return (
    <div style={{
      ...S.card, display: "flex", alignItems: "center", gap: 12, padding: 14,
      opacity: item.concluido ? 0.6 : 1,
    }}>
      <button onClick={() => onToggle(item)} style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
        {item.concluido ? <CheckCircle2 size={20} color={C.success} /> : <Circle size={20} color={C.muted} />}
      </button>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${corDisciplina}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={corDisciplina} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textDecoration: item.concluido ? "line-through" : "none" }}>
          {item.disciplina || TIPO_LABEL[item.tipo]}
        </p>
        <p style={{ ...S.mutedText, margin: "2px 0 0", fontSize: 12 }}>
          {item.descricao}{item.meta_quantidade ? ` · meta: ${item.meta_quantidade}` : ""}
          {mostrarData && item.data ? ` · ${new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
          {item.reorganizado && <span style={{ color: C.warn }}> · reagendado</span>}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão diária
// ---------------------------------------------------------------------------
function VisaoDia({ itens, data, onToggle }) {
  const doDia = itens.filter((i) => i.data === data);
  if (doDia.length === 0) {
    return (
      <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
        <Clock size={28} color={C.muted} style={{ marginBottom: 10 }} />
        <p style={{ ...S.mutedText, margin: 0 }}>Nenhuma sessão de estudo para hoje. Aproveite para revisar algo por conta própria!</p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {doDia.map((item) => <ItemLinha key={item.id} item={item} onToggle={onToggle} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão semanal
// ---------------------------------------------------------------------------
function VisaoSemana({ itens, onToggle }) {
  const dias = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // domingo desta semana
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana); d.setDate(inicioSemana.getDate() + i);
      return d;
    });
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
      {dias.map((d) => {
        const iso = toISODate(d);
        const doDia = itens.filter((i) => i.data === iso);
        const isHoje = iso === hojeISO();
        return (
          <div key={iso} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{
              ...S.mutedText, textAlign: "center", fontWeight: 700, margin: 0, fontSize: 12,
              color: isHoje ? C.accent : C.muted,
            }}>
              {DIAS_SEMANA_LABELS[d.getDay()]} {d.getDate()}
            </p>
            {doDia.length === 0 ? (
              <div style={{ ...S.card, padding: 8, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: C.muted }}>—</span>
              </div>
            ) : doDia.map((item) => {
              const Icon = TIPO_ICON[item.tipo] || BookOpen;
              const cor = item.disciplina ? (DISC_COLORS[item.disciplina] || C.muted) : C.warn;
              return (
                <button
                  key={item.id}
                  onClick={() => onToggle(item)}
                  title={item.descricao}
                  style={{
                    ...S.card, padding: 8, cursor: "pointer", textAlign: "left",
                    opacity: item.concluido ? 0.5 : 1, border: `1px solid ${item.concluido ? C.border : cor}44`,
                  }}
                >
                  <Icon size={12} color={cor} />
                  <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, textDecoration: item.concluido ? "line-through" : "none" }}>
                    {(item.disciplina || TIPO_LABEL[item.tipo]).slice(0, 12)}
                  </p>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão mensal
// ---------------------------------------------------------------------------
function VisaoMes({ itens, mesReferencia, setMesReferencia, diaSelecionado, setDiaSelecionado, onToggle }) {
  const celulas = useMemo(() => {
    const ano = mesReferencia.getFullYear(), mes = mesReferencia.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const inicioGrade = new Date(primeiroDia);
    inicioGrade.setDate(primeiroDia.getDate() - primeiroDia.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrade); d.setDate(inicioGrade.getDate() + i);
      return d;
    });
  }, [mesReferencia]);

  function mudarMes(delta) {
    const novo = new Date(mesReferencia); novo.setMonth(novo.getMonth() + delta);
    setMesReferencia(novo);
  }

  const doDiaSelecionado = itens.filter((i) => i.data === diaSelecionado);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => mudarMes(-1)} style={S.btnGhost}>‹</button>
        <p style={{ fontWeight: 700, margin: 0 }}>
          {mesReferencia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <button onClick={() => mudarMes(1)} style={S.btnGhost}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 24 }}>
        {DIAS_SEMANA_LABELS.map((l) => (
          <p key={l} style={{ ...S.mutedText, textAlign: "center", fontSize: 11, margin: "0 0 4px" }}>{l}</p>
        ))}
        {celulas.map((d, i) => {
          const iso = toISODate(d);
          const doMesAtual = d.getMonth() === mesReferencia.getMonth();
          const doDia = itens.filter((it) => it.data === iso);
          const concluidos = doDia.filter((it) => it.concluido).length;
          const temAtraso = doDia.some((it) => !it.concluido && iso < hojeISO());
          let corPonto = null;
          if (doDia.length > 0) {
            corPonto = temAtraso ? C.danger : concluidos === doDia.length ? C.success : C.accent;
          }
          return (
            <button
              key={i}
              onClick={() => setDiaSelecionado(iso)}
              style={{
                aspectRatio: "1", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${diaSelecionado === iso ? C.accent : C.border}`,
                background: iso === hojeISO() ? "rgba(88,166,255,0.08)" : "transparent",
                opacity: doMesAtual ? 1 : 0.3,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                color: C.text, fontSize: 12,
              }}
            >
              {d.getDate()}
              {corPonto && <span style={{ width: 5, height: 5, borderRadius: "50%", background: corPonto }} />}
            </button>
          );
        })}
      </div>

      <p style={{ ...S.mutedText, fontWeight: 700, marginBottom: 10 }}>
        {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </p>
      {doDiaSelecionado.length === 0 ? (
        <p style={{ ...S.mutedText }}>Nenhuma sessão nesse dia.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {doDiaSelecionado.map((item) => <ItemLinha key={item.id} item={item} onToggle={onToggle} />)}
        </div>
      )}
    </div>
  );
}
