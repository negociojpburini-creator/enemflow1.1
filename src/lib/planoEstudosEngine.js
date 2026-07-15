// src/lib/planoEstudosEngine.js
//
// Funções puras (sem I/O) que decidem COMO montar e reorganizar um plano de
// estudos. Separado do componente de UI de propósito: mais fácil de revisar,
// testar e reutilizar (ex.: nas visões diária/semanal/mensal, todas
// consomem os mesmos itens gerados aqui).

export const DIAS_SEMANA_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Sugestão inicial de dias/semana com base na resposta de onboarding
// "tempo disponível por dia" — ponto de partida editável pelo usuário.
export function sugerirDiasSemana(tempoDisponivel) {
  if (tempoDisponivel === "Mais de 4h") return [1, 2, 3, 4, 5, 6]; // seg-sáb
  if (tempoDisponivel === "2h a 4h") return [1, 2, 3, 4, 5]; // seg-sex
  return [1, 3, 5]; // seg/qua/sex — ritmo leve (< 2h/dia)
}

export function sugerirMetaQuestoesPorSessao(tempoDisponivel) {
  if (tempoDisponivel === "Mais de 4h") return 20;
  if (tempoDisponivel === "2h a 4h") return 15;
  return 10;
}

// Ordena as 8 disciplinas da mais fraca para a mais forte a partir do
// percentual de acerto observado (simulados + banco de questões). Quem
// nunca respondeu nada em uma disciplina entra como prioridade alta
// (assume-se fraca até prova em contrário).
export function ordenarDisciplinasPorDesempenho(desempenhoPorDisciplina, todasDisciplinas) {
  return [...todasDisciplinas].sort((a, b) => {
    const pa = desempenhoPorDisciplina[a]?.pct ?? -1; // -1 = sem dados, vai pro topo (prioridade)
    const pb = desempenhoPorDisciplina[b]?.pct ?? -1;
    return pa - pb;
  });
}

// Weighted Round Robin clássico (usado em escalonadores de rede): distribui
// itens de peso diferente de forma intercalada e proporcional, em vez de
// agrupar tudo do item mais pesado no início.
function weightedRoundRobin(items, totalSlots) {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0 || totalSlots === 0) return [];
  const credits = items.map((i) => ({ ...i, credit: 0 }));
  const result = [];
  for (let slot = 0; slot < totalSlots; slot++) {
    credits.forEach((c) => { c.credit += c.weight; });
    let maxIdx = 0;
    for (let j = 1; j < credits.length; j++) {
      if (credits[j].credit > credits[maxIdx].credit) maxIdx = j;
    }
    result.push(credits[maxIdx].key);
    credits[maxIdx].credit -= totalWeight;
  }
  return result;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

// Retorna as próximas `quantidade` datas (a partir de `dataInicio`,
// inclusive) que caem em algum dos dias da semana escolhidos.
export function proximasDatasDeEstudo(diasSemana, dataInicio, quantidade) {
  const datas = [];
  const cursor = new Date(dataInicio);
  cursor.setHours(0, 0, 0, 0);
  let tentativas = 0;
  while (datas.length < quantidade && tentativas < quantidade * 20) {
    if (diasSemana.includes(cursor.getDay())) datas.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    tentativas++;
  }
  return datas;
}

// -----------------------------------------------------------------------------
// Geração do plano completo (mensal = `semanas` semanas)
// -----------------------------------------------------------------------------
export function gerarPlanoAutomatico({
  disciplinasOrdenadas, // mais fraca -> mais forte, as 8
  diasSemana,           // [0-6]
  semanas = 4,
  dataInicio = new Date(),
  metaQuestoesPorSessao = 12,
}) {
  const diasPorSemana = Math.max(1, diasSemana.length);
  const totalDias = diasPorSemana * semanas;
  const datas = proximasDatasDeEstudo(diasSemana, dataInicio, totalDias);

  // Reserva posições fixas para redação (a cada 6 sessões de estudo) e
  // revisão geral (a cada 12) — o resto vira sessão de questões.
  const posicoesRedacao = new Set();
  const posicoesRevisao = new Set();
  for (let i = 5; i < totalDias; i += 6) posicoesRedacao.add(i);
  for (let i = 11; i < totalDias; i += 12) posicoesRevisao.add(i);

  const totalQuestoes = totalDias - posicoesRedacao.size - posicoesRevisao.size;

  // Peso decrescente: a disciplina mais fraca (índice 0) recebe o maior peso.
  const items = disciplinasOrdenadas.map((disc, i) => ({
    key: disc,
    weight: Math.max(1, disciplinasOrdenadas.length - i),
  }));
  const sequenciaDisciplinas = weightedRoundRobin(items, totalQuestoes);

  const top2 = new Set(disciplinasOrdenadas.slice(0, 2));
  const top4 = new Set(disciplinasOrdenadas.slice(0, 4));

  let cursorQuestoes = 0;
  const itens = datas.map((data, i) => {
    const dataISO = toISODate(data);

    if (posicoesRedacao.has(i)) {
      return {
        data: dataISO, disciplina: "Linguagens", tipo: "redacao",
        descricao: "Escrever uma redação completa (tema livre ou do arquivo histórico)",
        prioridade: "media", meta_quantidade: 1,
      };
    }
    if (posicoesRevisao.has(i)) {
      return {
        data: dataISO, disciplina: null, tipo: "revisao",
        descricao: "Revisão geral: refazer as questões que você errou até agora",
        prioridade: "media", meta_quantidade: metaQuestoesPorSessao,
      };
    }
    const disciplina = sequenciaDisciplinas[cursorQuestoes] || disciplinasOrdenadas[0];
    cursorQuestoes++;
    const prioridade = top2.has(disciplina) ? "alta" : top4.has(disciplina) ? "media" : "baixa";
    return {
      data: dataISO, disciplina, tipo: "questoes",
      descricao: `Praticar questões de ${disciplina}`,
      prioridade, meta_quantidade: metaQuestoesPorSessao,
    };
  });

  return itens;
}

// -----------------------------------------------------------------------------
// Reorganização: itens atrasados (data no passado, não concluídos) são
// redistribuídos para as próximas datas de estudo disponíveis, na mesma
// ordem em que estavam atrasados. Preserva disciplina/tipo/meta de cada um.
// -----------------------------------------------------------------------------
export function reorganizarItensAtrasados({ itensAtrasados, diasSemana, hoje = new Date() }) {
  if (itensAtrasados.length === 0) return [];
  const novasDatas = proximasDatasDeEstudo(diasSemana, hoje, itensAtrasados.length);
  return itensAtrasados.map((item, i) => ({
    ...item,
    data_original: item.data_original || item.data,
    data: toISODate(novasDatas[i] || hoje),
    reorganizado: true,
  }));
}