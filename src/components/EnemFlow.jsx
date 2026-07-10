import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  Home, ClipboardList, PenTool, BarChart3, Clock, CheckCircle2, XCircle,
  RotateCcw, Copy, ChevronDown, Sparkles, Check, Flag, AlertTriangle,
  Lightbulb, RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "./LoginScreen";
import LoadingScreen from "./LoadingScreen";

// ---------------------------------------------------------------------------
// Design tokens (Ultra Dark Premium Mode, per spec)
// ---------------------------------------------------------------------------
const C = {
  bg: "#0d1117",
  card: "#161b22",
  border: "#30363d",
  text: "#e1e4e8",
  muted: "#8b949e",
  accent: "#58a6ff",
  success: "#34d058",
  warn: "#d2a8ff",
  danger: "#f85149",
};

const DISCIPLINES = [
  "Matemática", "Física", "Química", "Biologia",
  "História", "Geografia", "Linguagens", "Filosofia/Sociologia",
];

const DISC_COLORS = {
  "Matemática": "#58a6ff",
  "Física": "#d2a8ff",
  "Química": "#34d058",
  "Biologia": "#f2cc60",
  "História": "#f78166",
  "Geografia": "#79c0ff",
  "Linguagens": "#ff9bce",
  "Filosofia/Sociologia": "#a5a5f0",
};

// ---------------------------------------------------------------------------
// Seed data — 20 original high-difficulty practice questions
// ---------------------------------------------------------------------------
const FALLBACK_QUESTION_POOL = [
  {
    id: "q1", disciplina: "Matemática",
    enunciado: "Uma caixa d'água cilíndrica tem raio 2 m e está sendo enchida a uma vazão constante de 0,5 m³/min. Considerando π ≈ 3, em quantos minutos o nível da água sobe 1,5 m?",
    alternativas: { A: "9 min", B: "12 min", C: "18 min", D: "24 min", E: "36 min" },
    correta: "C",
  },
  {
    id: "q2", disciplina: "Matemática",
    enunciado: "Uma empresa reduz o preço de um produto em 20% e, em seguida, aplica um aumento de 25% sobre o novo valor. Em relação ao preço original, o preço final representa:",
    alternativas: { A: "Uma redução de 5%", B: "O mesmo valor original", C: "Um aumento de 5%", D: "Um aumento de 10%", E: "Uma redução de 10%" },
    correta: "B",
  },
  {
    id: "q3", disciplina: "Matemática",
    enunciado: "Em uma progressão geométrica de razão 3, o terceiro termo vale 45. A soma dos quatro primeiros termos dessa progressão é:",
    alternativas: { A: "150", B: "155", C: "195", D: "200", E: "205" },
    correta: "D",
  },
  {
    id: "q4", disciplina: "Física",
    enunciado: "Um carrinho parte do repouso e acelera uniformemente a 2 m/s². Considerando desprezível o atrito, a distância percorrida nos primeiros 5 segundos é de:",
    alternativas: { A: "10 m", B: "20 m", C: "25 m", D: "50 m", E: "100 m" },
    correta: "C",
  },
  {
    id: "q5", disciplina: "Física",
    enunciado: "Duas resistências, de 6 Ω e 3 Ω, estão associadas em paralelo em um circuito alimentado por uma fonte de 12 V. A corrente total fornecida pela fonte é de:",
    alternativas: { A: "2 A", B: "3 A", C: "4 A", D: "6 A", E: "9 A" },
    correta: "D",
  },
  {
    id: "q6", disciplina: "Física",
    enunciado: "Um espelho côncavo forma uma imagem real, invertida e do mesmo tamanho do objeto. Isso ocorre quando o objeto está posicionado:",
    alternativas: { A: "No foco do espelho", B: "No centro de curvatura", C: "Entre o foco e o vértice", D: "Além do centro de curvatura", E: "No infinito" },
    correta: "B",
  },
  {
    id: "q7", disciplina: "Química",
    enunciado: "Uma solução aquosa de ácido clorídrico apresenta pH igual a 2. Ao ser diluída dez vezes, o novo pH aproximado da solução passa a ser:",
    alternativas: { A: "1", B: "2", C: "3", D: "4", E: "12" },
    correta: "C",
  },
  {
    id: "q8", disciplina: "Química",
    enunciado: "Um elemento químico possui configuração eletrônica terminada em 3d⁵4s¹, com número atômico 24. Esse elemento pertence ao grupo dos metais de transição e é identificado como:",
    alternativas: { A: "Cálcio", B: "Cromo", C: "Manganês", D: "Ferro", E: "Cobalto" },
    correta: "B",
  },
  {
    id: "q9", disciplina: "Biologia",
    enunciado: "Durante a respiração celular aeróbica, a etapa responsável pela maior produção de ATP ocorre na:",
    alternativas: { A: "Glicólise", B: "Fermentação lática", C: "Cadeia respiratória", D: "Fotólise da água", E: "Ciclo de Calvin" },
    correta: "C",
  },
  {
    id: "q10", disciplina: "Biologia",
    enunciado: "Um casal, ambos heterozigotos para uma característica autossômica recessiva, planeja ter quatro filhos. A probabilidade de exatamente um deles nascer com o fenótipo recessivo é calculada usando distribuição binomial com p = 1/4. Essa probabilidade é de:",
    alternativas: { A: "6,25%", B: "25%", C: "31,6%", D: "42,2%", E: "75%" },
    correta: "D",
  },
  {
    id: "q11", disciplina: "Biologia",
    enunciado: "Em um ecossistema, a remoção de um predador de topo costuma provocar um efeito em cascata conhecido como:",
    alternativas: { A: "Sucessão primária", B: "Cascata trófica", C: "Mutualismo obrigatório", D: "Deriva genética", E: "Especiação simpátrica" },
    correta: "B",
  },
  {
    id: "q12", disciplina: "História",
    enunciado: "O processo de industrialização tardia do Brasil, intensificado a partir da década de 1930, teve como uma de suas principais características:",
    alternativas: { A: "A ausência total de intervenção estatal na economia", B: "A substituição de importações com forte participação do Estado", C: "A predominância do capital estrangeiro desde o início do século XIX", D: "O fim imediato da economia agroexportadora", E: "A adoção do livre-câmbio irrestrito" },
    correta: "B",
  },
  {
    id: "q13", disciplina: "História",
    enunciado: "A Guerra Fria caracterizou-se por um conflito indireto entre Estados Unidos e União Soviética, marcado por disputas ideológicas e corrida armamentista, sem confronto militar direto entre as duas potências. Esse tipo de conflito é chamado de:",
    alternativas: { A: "Guerra total", B: "Guerra de posição", C: "Guerra por procuração", D: "Guerra relâmpago", E: "Guerra civil" },
    correta: "C",
  },
  {
    id: "q14", disciplina: "História",
    enunciado: "O movimento das Diretas Já, ocorrido no Brasil em 1984, teve como principal reivindicação:",
    alternativas: { A: "A anistia aos presos políticos", B: "A eleição direta para presidente da República", C: "A criação de uma nova moeda", D: "A convocação de uma Assembleia Constituinte exclusiva", E: "O fim da censura à imprensa" },
    correta: "B",
  },
  {
    id: "q15", disciplina: "Geografia",
    enunciado: "O fenômeno da inversão térmica, comum em grandes centros urbanos durante o inverno, contribui diretamente para:",
    alternativas: { A: "A dispersão mais rápida dos poluentes atmosféricos", B: "A retenção de poluentes próximos à superfície", C: "O aumento da velocidade dos ventos", D: "A redução da umidade relativa do ar", E: "A formação de correntes de convecção intensas" },
    correta: "B",
  },
  {
    id: "q16", disciplina: "Geografia",
    enunciado: "O conceito de \"nova ordem mundial multipolar\" está associado à:",
    alternativas: { A: "Manutenção de apenas duas superpotências hegemônicas", B: "Ascensão de diversos polos de poder econômico e político, além dos EUA", C: "Concentração total do poder global na ONU", D: "Extinção dos blocos econômicos regionais", E: "Volta ao colonialismo formal do século XIX" },
    correta: "B",
  },
  {
    id: "q17", disciplina: "Linguagens",
    enunciado: "Em um texto argumentativo, o uso de conectivos como \"todavia\", \"não obstante\" e \"ainda que\" tem, predominantemente, a função de expressar:",
    alternativas: { A: "Adição de ideias", B: "Relação de causa e consequência", C: "Contraste ou concessão", D: "Sequência temporal", E: "Comparação de igualdade" },
    correta: "C",
  },
  {
    id: "q18", disciplina: "Linguagens",
    enunciado: "A variação linguística que ocorre em função do grau de formalidade exigido por uma situação comunicativa é classificada como variação:",
    alternativas: { A: "Regional", B: "Histórica", C: "Social", D: "Estilística", E: "Fonética" },
    correta: "D",
  },
  {
    id: "q19", disciplina: "Filosofia/Sociologia",
    enunciado: "Para o sociólogo Émile Durkheim, os fatos sociais caracterizam-se, sobretudo, por serem:",
    alternativas: { A: "Individuais, voluntários e passageiros", B: "Exteriores ao indivíduo, coercitivos e gerais", C: "Restritos à esfera econômica", D: "Determinados exclusivamente pela biologia humana", E: "Incapazes de influenciar o comportamento coletivo" },
    correta: "B",
  },
  {
    id: "q20", disciplina: "Filosofia/Sociologia",
    enunciado: "No pensamento de Karl Marx, o conceito de \"mais-valia\" refere-se:",
    alternativas: { A: "Ao lucro obtido exclusivamente com a venda de terras", B: "À diferença entre o valor produzido pelo trabalhador e o salário recebido", C: "Ao imposto cobrado sobre a produção industrial", D: "À valorização cultural do trabalho artesanal", E: "Ao valor de troca fixado pelo Estado" },
    correta: "B",
  },
];

// Historical essay themes — titles are public factual record; supporting
// blurbs below are original illustrative summaries, not reproductions of
// official motivational texts.
const FALLBACK_REDACAO_TEMAS = [
  {
    id: "t2023", ano: 2023, tipo: "Oficial",
    tema: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    eixos: ["Trabalho doméstico", "Desigualdade de gênero", "Políticas públicas"],
    resumo: "Discute como o trabalho de cuidado não remunerado, majoritariamente exercido por mulheres, permanece pouco reconhecido social e economicamente no país.",
  },
  {
    id: "t2022", ano: 2022, tipo: "Oficial",
    tema: "Desafios para a valorização de comunidades e povos tradicionais no Brasil",
    eixos: ["Povos indígenas", "Comunidades quilombolas", "Identidade cultural"],
    resumo: "Aborda a preservação de saberes, territórios e modos de vida de grupos tradicionais frente à pressão econômica e cultural do restante da sociedade.",
  },
  {
    id: "t2021", ano: 2021, tipo: "Oficial",
    tema: "Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil",
    eixos: ["Documentação civil", "Exclusão social", "Acesso a direitos"],
    resumo: "Trata da parcela da população sem registro civil e das barreiras que essa ausência impõe ao acesso a serviços básicos e à cidadania plena.",
  },
  {
    id: "t2020", ano: 2020, tipo: "Oficial",
    tema: "O estigma associado às doenças mentais na sociedade brasileira",
    eixos: ["Saúde mental", "Preconceito", "Acesso a tratamento"],
    resumo: "Examina como o preconceito em torno de transtornos mentais dificulta diagnóstico, tratamento e reinserção social de quem convive com eles.",
  },
  {
    id: "t2019", ano: 2019, tipo: "Oficial",
    tema: "Democratização do acesso ao cinema no Brasil",
    eixos: ["Cultura", "Acesso e infraestrutura", "Produção nacional"],
    resumo: "Reflete sobre a concentração de salas de cinema em grandes centros urbanos e os obstáculos ao acesso à produção audiovisual nacional.",
  },
  {
    id: "t2018", ano: 2018, tipo: "Oficial",
    tema: "Manipulação do comportamento do usuário pelo controle de dados na internet",
    eixos: ["Privacidade digital", "Big data", "Liberdade individual"],
    resumo: "Discute o uso de dados pessoais por plataformas digitais para direcionar comportamento, consumo e opinião dos usuários.",
  },
];

// Areas of knowledge (as officially grouped by the ENEM exam)
const AREAS = ["Linguagens", "Humanas", "Natureza", "Matemática"];
const AREA_TO_DISCIPLINAS = {
  "Linguagens": ["Linguagens"],
  "Humanas": ["História", "Geografia", "Filosofia/Sociologia"],
  "Natureza": ["Física", "Química", "Biologia"],
  "Matemática": ["Matemática"],
};

// Mock cutoff scores (nota de corte média, estilo TRI) per target course
const TARGET_COURSES = {
  "Medicina": { "Linguagens": 680, "Humanas": 670, "Natureza": 720, "Matemática": 740 },
  "Direito": { "Linguagens": 650, "Humanas": 660, "Natureza": 600, "Matemática": 620 },
  "Engenharia": { "Linguagens": 600, "Humanas": 580, "Natureza": 680, "Matemática": 710 },
  "Administração": { "Linguagens": 580, "Humanas": 570, "Natureza": 540, "Matemática": 580 },
};

// Illustrative essay competency scores (0-200 each, ENEM style) — placeholder
// until the platform has real essay grading; slightly lower on the axis that
// matches the user's self-reported weak point from onboarding.
const COMPETENCIAS_BASE = {
  "Gramática": 160, "Proposta": 150, "Estrutura": 140, "Coesão": 130, "Repertório": 120,
};

const FALLBACK_CURIOSIDADES = [
  {
    id: "c1", categoria: "TRI",
    titulo: "Por que duas notas iguais em acertos podem valer pontuações diferentes?",
    fato: "A Teoria de Resposta ao Item (TRI) faz com que duas pessoas com o mesmo número de acertos tenham notas totalmente diferentes.",
    impacto: "Acertar as questões mais difíceis pesa mais do que acertar várias fáceis — por isso simulados hardcore treinam justamente esse padrão.",
  },
  {
    id: "c2", categoria: "Estatisticas",
    titulo: "A calibração da TRI pode gerar notas acima de 1000 pontos",
    fato: "A maior nota da história da prova de Matemática do ENEM passou dos 1000 pontos devido à calibração da TRI.",
    impacto: "A escala não é simples proporção de acertos — entender isso ajuda a não se frustrar com pequenas variações de desempenho.",
  },
  {
    id: "c3", categoria: "Redacao",
    titulo: "Tema de redação de 2015",
    fato: "O tema da redação do ENEM de 2015 foi \"A persistência da violência contra a mulher na sociedade brasileira\".",
    impacto: "Temas de anos anteriores raramente se repetem, mas os eixos temáticos (direitos humanos, cidadania, tecnologia) costumam voltar.",
  },
  {
    id: "c4", categoria: "Historia",
    titulo: "O ENEM já teve mais de uma aplicação por ano",
    fato: "Além da aplicação regular, o ENEM conta com edições PPL (Pessoas Privadas de Liberdade) e reaplicações para casos específicos.",
    impacto: "Cada edição tem um caderno de cor diferente, o que dificulta a cola e garante comparabilidade entre provas.",
  },
  {
    id: "c5", categoria: "Estatisticas",
    titulo: "Nem todo mundo termina a prova",
    fato: "Uma parte significativa dos participantes não conclui todas as 180 questões dentro do tempo disponível.",
    impacto: "Treinar sob pressão de tempo, como no simulado hardcore de 2h, é tão importante quanto dominar o conteúdo.",
  },
];

// ---------------------------------------------------------------------------
// Acesso a dados via Supabase SDK (@supabase/supabase-js)
//
// A autenticação é 100% gerenciada pelo AuthContext (src/contexts/AuthContext.js)
// através do cliente único em src/lib/supabaseClient.js — o mesmo cliente é
// usado aqui para ler/gravar dados, então o token de sessão do usuário
// logado já vai automaticamente em cada requisição (nenhum header manual).
// ---------------------------------------------------------------------------
async function fetchQuestoesDoBanco() {
  const { data, error } = await supabase
    .from("questoes")
    .select("*")
    .eq("dificuldade", "Alta");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    disciplina: r.disciplina,
    enunciado: r.enunciado,
    alternativas: { A: r.alternativa_a, B: r.alternativa_b, C: r.alternativa_c, D: r.alternativa_d, E: r.alternativa_e },
    correta: r.resposta_correta,
  }));
}

async function fetchHistoricoDoBanco() {
  const { data, error } = await supabase
    .from("simulados_historico")
    .select("*")
    .order("data_realizacao", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id, data: r.data_realizacao, acertos: r.acertos, erros: r.erros,
    tempoGasto: r.tempo_gasto_segundos, respostas: r.respostas_usuario,
    porDisciplina: r.por_disciplina || {},
  }));
}

async function salvarSimuladoNoBanco(result, userId) {
  const pontuacao = Math.round((result.acertos / (result.acertos + result.erros)) * 1000);
  const { error } = await supabase.from("simulados_historico").insert({
    user_id: userId,
    pontuacao,
    tempo_gasto_segundos: result.tempoGasto,
    acertos: result.acertos,
    erros: result.erros,
    respostas_usuario: result.respostas,
    por_disciplina: result.porDisciplina,
  });
  if (error) throw error;
}

async function fetchTemasDoBanco() {
  const { data, error } = await supabase
    .from("redacoes_temas")
    .select("*")
    .order("ano", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id, ano: r.ano, tipo: r.tipo, tema: r.tema,
    eixos: r.eixos_tematicos || [], resumo: r.proposta_contexto,
  }));
}

async function fetchCuriosidadesDoBanco() {
  const { data, error } = await supabase.from("enem_curiosidades").select("*");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id, categoria: r.categoria, titulo: r.titulo,
    fato: r.fato_historico, impacto: r.impacto_estudo || "",
  }));
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------
function fmtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Estimates a TRI-style score (300-1000) per knowledge area from the
// simulado history. This is a simplified linear approximation for
// illustration purposes, not an official TRI calculation.
function calcAreaScores(history) {
  const totals = {};
  AREAS.forEach((area) => { totals[area] = { acertos: 0, total: 0 }; });
  history.forEach((h) => {
    Object.entries(h.porDisciplina || {}).forEach(([disc, v]) => {
      const area = Object.entries(AREA_TO_DISCIPLINAS).find(([, list]) => list.includes(disc))?.[0];
      if (!area) return;
      totals[area].acertos += v.acertos;
      totals[area].total += v.acertos + v.erros;
    });
  });
  const scores = {};
  AREAS.forEach((area) => {
    const t = totals[area];
    const acc = t.total > 0 ? t.acertos / t.total : 0;
    scores[area] = Math.round(300 + acc * 700);
  });
  return scores;
}

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------
const S = {
  page: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 },
  mutedText: { color: C.muted, fontSize: 13 },
  btnPrimary: (disabled) => ({
    padding: "10px 20px", borderRadius: 10, border: "none",
    background: disabled ? "#274361" : C.accent,
    color: disabled ? "#7f93ab" : "#0d1117", fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", fontSize: 14,
    transition: "opacity .15s",
  }),
  btnGhost: {
    padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
    background: "transparent", color: C.text, fontWeight: 600,
    cursor: "pointer", fontSize: 14,
  },
};

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
const ONBOARDING_QUESTIONS = [
  { key: "foco", label: "Qual seu foco de carreira?", options: ["Humanas", "Exatas", "Biológicas", "Geral"] },
  { key: "tempo", label: "Quanto tempo você tem disponível por dia para estudar?", options: ["Menos de 2h", "2h a 4h", "Mais de 4h"] },
  { key: "historico", label: "Qual seu histórico de estudo para o ENEM?", options: ["Primeira tentativa", "Já realizou anteriormente", "Focado em vestibulares regionais"] },
  { key: "fraqueza", label: "Qual seu maior ponto fraco autoavaliado?", options: ["Matemática", "Redação", "Ciências da Natureza", "Ciências Humanas"] },
  { key: "meta", label: "Qual sua meta de pontuação geral?", options: ["Menos de 600", "600 a 750", "Mais de 750"] },
];

// ---------------------------------------------------------------------------
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const q = ONBOARDING_QUESTIONS[step];
  const selected = answers[q.key];
  const isLast = step === ONBOARDING_QUESTIONS.length - 1;

  async function handleAdvance() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onComplete(answers);
      // Sucesso: o componente pai troca de tela sozinho (deixa de renderizar
      // <Onboarding />), então não precisamos fazer nada aqui.
    } catch (err) {
      setError(
        err?.message ||
        "Não foi possível salvar seu diagnóstico agora. Verifique sua conexão e tente novamente."
      );
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {ONBOARDING_QUESTIONS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 5, borderRadius: 4,
              background: i <= step ? C.accent : C.border,
              transition: "background .25s",
            }} />
          ))}
        </div>
        <div key={step} style={{ ...S.card, animation: "fadeIn .3s ease" }}>
          <p style={{ ...S.mutedText, marginTop: 0 }}>Etapa {step + 1} de {ONBOARDING_QUESTIONS.length}</p>
          <h2 style={{ margin: "4px 0 24px", fontSize: 21, fontWeight: 700 }}>{q.label}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt) => {
              const active = selected === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
                  style={{
                    textAlign: "left", padding: "14px 16px", borderRadius: 10,
                    border: `1.5px solid ${active ? C.accent : C.border}`,
                    background: active ? "rgba(88,166,255,0.12)" : "transparent",
                    color: C.text, fontSize: 15, cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all .15s",
                  }}
                >
                  {opt}
                  {active && <Check size={18} color={C.accent} />}
                </button>
              );
            })}
          </div>

          {error && (
            <p style={{ color: C.danger, fontSize: 13, marginTop: 16, marginBottom: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
            <button
              disabled={!selected || submitting}
              style={S.btnPrimary(!selected || submitting)}
              onClick={handleAdvance}
            >
              {submitting ? "Salvando..." : isLast ? "Concluir e personalizar" : "Avançar"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------
function TopNav({ screen, setScreen, onRedoOnboarding, locked, userEmail, onLogout }) {
  const items = [
    { key: "painel", label: "Painel", icon: Home },
    { key: "simulado", label: "Simulado", icon: ClipboardList },
    { key: "redacao", label: "Redação", icon: PenTool },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
      background: C.card, position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, color: "#0d1117", fontSize: 14,
        }}>E</div>
        <span style={{ fontWeight: 700, fontSize: 16 }}>EnemFlow</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            disabled={locked}
            onClick={() => setScreen(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "none",
              background: screen === key ? "rgba(88,166,255,0.14)" : "transparent",
              color: screen === key ? C.accent : (locked ? "#555c66" : C.muted),
              fontWeight: 600, fontSize: 14, cursor: locked ? "not-allowed" : "pointer",
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {userEmail && <span style={{ ...S.mutedText, fontSize: 13 }}>{userEmail}</span>}
        <button
          disabled={locked}
          onClick={onRedoOnboarding}
          style={{ ...S.btnGhost, padding: "7px 12px", fontSize: 13, opacity: locked ? 0.4 : 1 }}
        >
          Refazer diagnóstico
        </button>
        <button
          disabled={locked}
          onClick={onLogout}
          style={{ ...S.btnGhost, padding: "7px 12px", fontSize: 13, opacity: locked ? 0.4 : 1 }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel (Dashboard)
// ---------------------------------------------------------------------------
function Painel({ history, profile, goSimulado }) {
  const [tab, setTab] = useState("geral");
  const [targetCourse, setTargetCourse] = useState("Medicina");

  if (!history.length) {
    return (
      <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Bem-vindo(a) de volta</h1>
        <p style={S.mutedText}>
          Foco: {profile?.foco || "—"} · Meta: {profile?.meta || "—"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 24, alignItems: "start" }}>
          <div style={{ ...S.card, textAlign: "center", padding: 48 }}>
            <BarChart3 size={40} color={C.muted} style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px" }}>Nenhum simulado concluído ainda</h3>
            <p style={{ ...S.mutedText, marginBottom: 20 }}>
              Conclua seu primeiro simulado para ver sua evolução aqui.
            </p>
            <button style={S.btnPrimary(false)} onClick={goSimulado}>Iniciar simulado</button>
          </div>
          <CuriosityCard />
        </div>
      </div>
    );
  }

  const evolucao = history.map((h) => ({
    data: fmtDate(h.data), pontuacao: Math.round((h.acertos / 20) * 1000),
  }));

  const errosPorDisciplina = {};
  history.forEach((h) => {
    Object.entries(h.porDisciplina || {}).forEach(([disc, v]) => {
      errosPorDisciplina[disc] = (errosPorDisciplina[disc] || 0) + v.erros;
    });
  });
  const pieData = Object.entries(errosPorDisciplina)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const mediaAcertos = (history.reduce((s, h) => s + h.acertos, 0) / history.length / 20 * 100).toFixed(0);
  const tempoMedio = (history.reduce((s, h) => s + h.tempoGasto, 0) / history.length / 20).toFixed(0);
  const totalSimulados = history.length;

  const areaScores = calcAreaScores(history);
  const cutoffs = TARGET_COURSES[targetCourse];
  const barData = AREAS.map((area) => ({
    area, "Sua nota estimada": areaScores[area], "Nota de corte média": cutoffs[area],
  }));

  const weakSpot = profile?.fraqueza;
  const radarData = Object.entries(COMPETENCIAS_BASE).map(([comp, val]) => ({
    competencia: comp,
    valor: weakSpot === "Redação" && (comp === "Repertório" || comp === "Coesão") ? Math.round(val * 0.7) : val,
  }));

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Painel de desempenho</h1>
      <p style={{ ...S.mutedText, marginBottom: 20 }}>
        Foco: {profile?.foco || "—"} · Meta: {profile?.meta || "—"}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "geral", label: "Visão geral" },
          { key: "provareal", label: "Análise de prova real" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "9px 16px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${tab === t.key ? C.accent : C.border}`,
              background: tab === t.key ? "rgba(88,166,255,0.12)" : "transparent",
              color: tab === t.key ? C.accent : C.text, fontWeight: 600, fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <MetricCard label="Média geral de acertos" value={`${mediaAcertos}%`} />
            <MetricCard label="Tempo médio por questão" value={`${tempoMedio}s`} />
            <MetricCard label="Total de simulados concluídos" value={totalSimulados} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={S.card}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Evolução da pontuação</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data" stroke={C.muted} fontSize={12} />
                  <YAxis stroke={C.muted} fontSize={12} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                  <Area type="monotone" dataKey="pontuacao" stroke={C.accent} strokeWidth={2} fill="url(#scoreGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Diagnóstico de erros</h3>
              {pieData.length === 0 ? (
                <p style={{ ...S.mutedText, textAlign: "center", marginTop: 60 }}>Sem erros registrados ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={DISC_COLORS[entry.name] || C.muted} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <CuriosityCard />
        </>
      )}

      {tab === "provareal" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ ...S.mutedText }}>Curso alvo:</span>
            <select
              value={targetCourse}
              onChange={(e) => setTargetCourse(e.target.value)}
              style={{
                background: C.card, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "6px 10px", fontSize: 13,
              }}
            >
              {Object.keys(TARGET_COURSES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={S.card}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Sua nota estimada vs. nota de corte</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" stroke={C.muted} fontSize={12} />
                  <YAxis stroke={C.muted} fontSize={12} domain={[300, 1000]} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  <Bar dataKey="Sua nota estimada" fill={C.accent} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Nota de corte média" fill={C.warn} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ ...S.mutedText, marginTop: 8, fontSize: 12 }}>
                Estimativa simplificada a partir do seu histórico de simulados — não é o cálculo oficial da TRI.
              </p>
            </div>
            <div style={S.card}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Competências da redação</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="competencia" stroke={C.muted} fontSize={11} />
                  <PolarRadiusAxis stroke={C.border} domain={[0, 200]} tick={false} />
                  <Radar dataKey="valor" stroke={C.warn} fill={C.warn} fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                </RadarChart>
              </ResponsiveContainer>
              <p style={{ ...S.mutedText, marginTop: 8, fontSize: 12 }}>
                Valores ilustrativos até que o app tenha correção de redações reais.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={S.card}>
      <p style={{ ...S.mutedText, margin: "0 0 8px" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Você sabia? — gamified curiosities card
// ---------------------------------------------------------------------------
function CuriosityCard() {
  const [list, setList] = useState(FALLBACK_CURIOSIDADES);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * FALLBACK_CURIOSIDADES.length));
  const [hovered, setHovered] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchCuriosidadesDoBanco();
        if (rows.length > 0) {
          setList(rows);
          setIndex(Math.floor(Math.random() * rows.length));
        }
      } catch {
        // mantém o fallback local silenciosamente
      }
    })();
  }, []);

  const fact = list[index];

  function trocar() {
    setSpinning(true);
    let next = Math.floor(Math.random() * list.length);
    if (list.length > 1 && next === index) {
      next = (next + 1) % list.length;
    }
    setIndex(next);
    setTimeout(() => setSpinning(false), 500);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.card,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 10px 24px rgba(0,0,0,0.35)" : "none",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Lightbulb size={17} color={C.warn} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Você sabia? — Especial ENEM</span>
      </div>
      <p style={{ ...S.mutedText, margin: "0 0 6px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {fact.categoria}
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px", fontWeight: 600 }}>{fact.titulo}</p>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: C.muted, margin: "0 0 8px" }}>{fact.fato}</p>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>{fact.impacto}</p>
      <button
        onClick={trocar}
        style={{
          ...S.btnGhost, display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "8px 14px",
        }}
      >
        <RefreshCw size={14} style={{
          animation: spinning ? "spin .5s linear" : "none",
        }} />
        Trocar curiosidade
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulado engine
// ---------------------------------------------------------------------------
const SIMULADO_SECONDS = 7200;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Simulado({ onFinish }) {
  const [questions, setQuestions] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SIMULADO_SECONDS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchQuestoesDoBanco();
        if (rows.length >= 5) {
          setQuestions(shuffle(rows).slice(0, 20));
        } else {
          setQuestions(shuffle(FALLBACK_QUESTION_POOL).slice(0, 20));
        }
      } catch (e) {
        setLoadError(true);
        setQuestions(shuffle(FALLBACK_QUESTION_POOL).slice(0, 20));
      }
    })();
  }, []);

  const finalize = useCallback(() => {
    if (finishedRef.current || !questions) return;
    finishedRef.current = true;
    const tempoGasto = Math.round((Date.now() - startRef.current) / 1000);
    let acertos = 0;
    const porDisciplina = {};
    questions.forEach((q) => {
      porDisciplina[q.disciplina] = porDisciplina[q.disciplina] || { acertos: 0, erros: 0 };
      if (answers[q.id] === q.correta) {
        acertos += 1;
        porDisciplina[q.disciplina].acertos += 1;
      } else {
        porDisciplina[q.disciplina].erros += 1;
      }
    });
    onFinish({
      id: `sim_${Date.now()}`, data: new Date().toISOString(),
      acertos, erros: questions.length - acertos,
      tempoGasto, respostas: answers, porDisciplina,
    });
  }, [answers, onFinish, questions]);

  useEffect(() => {
    if (!questions) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finalize();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [finalize, questions]);

  if (!questions) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 61px)" }}>
        <p style={S.mutedText}>Carregando questões do banco...</p>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const urgent = timeLeft < 300;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
      {loadError && (
        <div style={{
          position: "absolute", top: 68, right: 20, background: C.card,
          border: `1px solid ${C.warn}`, borderRadius: 8, padding: "8px 14px",
          fontSize: 12, color: C.warn, zIndex: 40,
        }}>
          Não foi possível carregar do banco — usando questões locais de reserva.
        </div>
      )}
      <div style={{
        width: 220, borderRight: `1px solid ${C.border}`, padding: 16,
        overflowY: "auto", flexShrink: 0,
      }}>
        <p style={{ ...S.mutedText, marginTop: 0 }}>{answeredCount}/{questions.length} respondidas</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {questions.map((qq, i) => {
            const isAnswered = answers[qq.id] !== undefined;
            const isCurrent = i === current;
            return (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                style={{
                  height: 38, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                  border: isCurrent ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                  background: isAnswered ? "rgba(52,208,88,0.15)" : "transparent",
                  color: isAnswered ? C.success : C.text,
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ ...S.mutedText }}>Questão {current + 1} de {questions.length} · {q.disciplina}</span>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace",
            fontSize: 20, fontWeight: 700, color: urgent ? C.danger : C.accent,
          }}>
            <Clock size={18} /> {fmtTime(timeLeft)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 28, maxWidth: 760 }}>
          <p style={{ fontSize: 17, lineHeight: 1.6, marginBottom: 24 }}>{q.enunciado}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(q.alternativas).map(([letter, text]) => {
              const active = answers[q.id] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
                  style={{
                    display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left",
                    padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${active ? C.accent : C.border}`,
                    background: active ? "rgba(88,166,255,0.1)" : "transparent",
                    color: C.text, fontSize: 15,
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${active ? C.accent : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: active ? C.accent : C.muted,
                  }}>{letter}</span>
                  {text}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button
              style={S.btnGhost}
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            >
              Anterior
            </button>
            {current < questions.length - 1 ? (
              <button style={S.btnPrimary(false)} onClick={() => setCurrent((c) => c + 1)}>Próxima</button>
            ) : (
              <button
                style={{ ...S.btnPrimary(false), background: C.danger, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setConfirmOpen(true)}
              >
                <Flag size={15} /> Finalizar simulado
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{ ...S.card, maxWidth: 420, textAlign: "center" }}>
            <AlertTriangle size={32} color={C.warn} style={{ marginBottom: 12 }} />
            <h3 style={{ marginTop: 0 }}>Finalizar simulado?</h3>
            <p style={S.mutedText}>
              Você respondeu {answeredCount} de {questions.length} questões.
              Após finalizar, não será possível alterar suas respostas.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
              <button style={S.btnGhost} onClick={() => setConfirmOpen(false)}>Continuar respondendo</button>
              <button
                style={{ ...S.btnPrimary(false), background: C.danger, color: "#fff" }}
                onClick={finalize}
              >
                Sim, finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resultado screen
// ---------------------------------------------------------------------------
function Resultado({ result, onGoPainel, onRetry }) {
  const total = result.acertos + result.erros;
  const pct = total > 0 ? Math.round((result.acertos / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 61px)", padding: 20 }}>
      <div style={{ ...S.card, maxWidth: 460, width: "100%", textAlign: "center" }}>
        <CheckCircle2 size={40} color={C.success} style={{ marginBottom: 12 }} />
        <h2 style={{ margin: "0 0 4px" }}>Simulado concluído</h2>
        <p style={{ ...S.mutedText, marginBottom: 24 }}>Confira seu desempenho abaixo</p>
        <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, marginBottom: 4 }}>{pct}%</div>
        <p style={{ ...S.mutedText, marginBottom: 24 }}>de aproveitamento</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ color: C.success, fontWeight: 700, fontSize: 20 }}>{result.acertos}</div>
            <div style={S.mutedText}>Acertos</div>
          </div>
          <div>
            <div style={{ color: C.danger, fontWeight: 700, fontSize: 20 }}>{result.erros}</div>
            <div style={S.mutedText}>Erros</div>
          </div>
          <div>
            <div style={{ color: C.warn, fontWeight: 700, fontSize: 20 }}>{fmtTime(result.tempoGasto)}</div>
            <div style={S.mutedText}>Tempo</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={S.btnGhost} onClick={onRetry}>Novo simulado</button>
          <button style={S.btnPrimary(false)} onClick={onGoPainel}>Ver no painel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Redação module
// ---------------------------------------------------------------------------
function Redacao() {
  const [temas, setTemas] = useState(FALLBACK_REDACAO_TEMAS);
  const [tab, setTab] = useState("historico");
  const [yearFilter, setYearFilter] = useState("Todos");
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTheme, setAiTheme] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchTemasDoBanco();
        if (rows.length > 0) setTemas(rows);
      } catch {
        // mantém o fallback local silenciosamente
      }
    })();
  }, []);

  const years = ["Todos", ...temas.map((t) => t.ano)];
  const filtered = yearFilter === "Todos" ? temas : temas.filter((t) => t.ano === yearFilter);

  async function gerarTemaIA() {
    setAiLoading(true);
    setAiError(null);
    setAiTheme(null);
    try {
      const systemPrompt =
        "Gere um tema inédito de redação seguindo rigorosamente a matriz de competências do ENEM. " +
        "O tema deve abordar debates modernos das seguintes áreas aleatórias: Avanço Tecnológico, Ética Digital, " +
        "Sustentabilidade Climática ou Dinâmicas Sociais Urbanas. Retorne SOMENTE um objeto JSON válido, sem markdown " +
        "e sem texto adicional, contendo: tema (string), ano_futuro (int), eixos_tematicos (array de strings), " +
        "proposta_contexto (string) e textos_motivadores (array com 3 textos simulados curtos, cada um como string).";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: systemPrompt }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("Resposta vazia da IA");
      const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAiTheme(parsed);
    } catch (e) {
      setAiError("Não foi possível gerar o tema agora. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  }

  function copiarTema() {
    if (!aiTheme) return;
    const txt = `${aiTheme.tema}\n\nEixos temáticos: ${(aiTheme.eixos_tematicos || []).join(", ")}\n\n${aiTheme.proposta_contexto}`;
    navigator.clipboard?.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Módulo de redação</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "historico", label: "Arquivo histórico" },
          { key: "gerador", label: "Gerador com IA" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "9px 16px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${tab === t.key ? C.accent : C.border}`,
              background: tab === t.key ? "rgba(88,166,255,0.12)" : "transparent",
              color: tab === t.key ? C.accent : C.text, fontWeight: 600, fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "historico" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${yearFilter === y ? C.accent : C.border}`,
                  background: yearFilter === y ? "rgba(88,166,255,0.12)" : "transparent",
                  color: yearFilter === y ? C.accent : C.muted,
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((t) => {
              const isOpen = expanded === t.id;
              return (
                <div key={t.id} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    style={{
                      width: "100%", background: "transparent", border: "none", cursor: "pointer",
                      padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
                      color: C.text, textAlign: "left",
                    }}
                  >
                    <div>
                      <span style={{ ...S.mutedText, marginRight: 10 }}>{t.ano}</span>
                      <span style={{ fontWeight: 600 }}>{t.tema}</span>
                    </div>
                    <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.border}` }}>
                      <p style={{ ...S.mutedText, margin: "14px 0 10px" }}>
                        Eixos temáticos: {t.eixos.join(", ")}
                      </p>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{t.resumo}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "gerador" && (
        <div>
          <button
            onClick={gerarTemaIA}
            disabled={aiLoading}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "13px 22px",
              borderRadius: 12, border: "none", cursor: aiLoading ? "wait" : "pointer",
              background: "linear-gradient(135deg, #58a6ff, #d2a8ff)",
              color: "#0d1117", fontWeight: 700, fontSize: 15, marginBottom: 24,
            }}
          >
            <Sparkles size={18} />
            {aiLoading ? "Gerando tema..." : "Gerar tema de redação inédito com IA"}
          </button>

          {aiError && <p style={{ color: C.danger }}>{aiError}</p>}

          {aiTheme && (
            <div style={S.card}>
              <span style={{ ...S.mutedText }}>Ano futuro sugerido: {aiTheme.ano_futuro}</span>
              <h3 style={{ margin: "8px 0 12px", fontSize: 19 }}>{aiTheme.tema}</h3>
              <p style={{ ...S.mutedText, marginBottom: 12 }}>
                Eixos temáticos: {(aiTheme.eixos_tematicos || []).join(", ")}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{aiTheme.proposta_contexto}</p>
              {(aiTheme.textos_motivadores || []).map((txt, i) => (
                <div key={i} style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: 12, marginBottom: 8, fontSize: 13, color: C.muted,
                }}>
                  Texto motivador {i + 1}: {txt}
                </div>
              ))}
              <button
                onClick={copiarTema}
                style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
              >
                <Copy size={14} /> {copied ? "Copiado!" : "Copiar proposta"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function EnemFlowApp() {
  const { user, profile, loading: authLoading, signOut, updateOnboardingProfile } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [dbError, setDbError] = useState(false);
  const [screen, setScreen] = useState("painel");
  const [lastResult, setLastResult] = useState(null);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  // Carrega o histórico de simulados assim que há um usuário autenticado
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setDataLoading(false);
      return;
    }
    let isMounted = true;
    setDataLoading(true);
    setDbError(false);
    fetchHistoricoDoBanco()
      .then((h) => { if (isMounted) setHistory(h); })
      .catch(() => { if (isMounted) setDbError(true); })
      .finally(() => { if (isMounted) setDataLoading(false); });
    return () => { isMounted = false; };
  }, [user]);

  async function handleOnboardingComplete(answers) {
    // Não engolimos o erro aqui: se updateOnboardingProfile falhar, deixamos
    // a exceção subir para o componente <Onboarding />, que mostra a
    // mensagem de erro na própria tela (em vez de travar sem feedback).
    await updateOnboardingProfile(answers);
    setForceOnboarding(false);
    setScreen("painel");
  }

  async function handleSimuladoFinish(result) {
    setLastResult(result);
    setScreen("resultado");
    try {
      await salvarSimuladoNoBanco(result, user.id);
      const h = await fetchHistoricoDoBanco();
      setHistory(h);
    } catch {
      setHistory((prev) => [...prev, result]);
      setDbError(true);
    }
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (dataLoading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={S.mutedText}>Carregando seus dados...</p>
      </div>
    );
  }

  const onboardingPendente = forceOnboarding || !profile?.foco;

  if (onboardingPendente) {
    return <div style={S.page}><Onboarding onComplete={handleOnboardingComplete} /></div>;
  }

  return (
    <div style={S.page}>
      {dbError && (
        <div style={{
          background: "rgba(248,81,73,0.12)", borderBottom: `1px solid ${C.danger}`,
          color: C.danger, fontSize: 13, padding: "8px 24px", textAlign: "center",
        }}>
          Não foi possível conectar ao banco de dados agora — alguns dados podem não estar salvos permanentemente.
        </div>
      )}
      <TopNav
        screen={screen}
        setScreen={setScreen}
        locked={screen === "simulado"}
        onRedoOnboarding={() => setForceOnboarding(true)}
        userEmail={user.email}
        onLogout={signOut}
      />
      {screen === "painel" && (
        <Painel history={history} profile={profile} goSimulado={() => setScreen("simulado")} />
      )}
      {screen === "simulado" && (
        <Simulado onFinish={handleSimuladoFinish} />
      )}
      {screen === "resultado" && lastResult && (
        <Resultado
          result={lastResult}
          onGoPainel={() => setScreen("painel")}
          onRetry={() => setScreen("simulado")}
        />
      )}
      {screen === "redacao" && <Redacao />}
    </div>
  );
}
