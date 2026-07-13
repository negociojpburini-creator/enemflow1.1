// pages/api/corrigir-redacao.js
//
// Rota de API do Next.js (roda só no servidor). Recebe o texto da redação,
// chama a API do Gemini para corrigir pelas 5 competências do ENEM, e
// devolve o resultado em JSON. A chave da API (GEMINI_API_KEY) NUNCA vai
// para o navegador — fica só em variável de ambiente do servidor (sem o
// prefixo NEXT_PUBLIC_, que é o que garante isso no Next.js).

const GEMINI_MODEL = "gemini-3.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não configurada no servidor. Adicione essa variável de ambiente (sem o prefixo NEXT_PUBLIC_) nas configurações do projeto.",
    });
  }

  const { texto, tema } = req.body || {};
  if (!texto || typeof texto !== "string" || texto.trim().length < 50) {
    return res.status(400).json({ error: "Envie um texto de redação com pelo menos 50 caracteres." });
  }

  const prompt = `Você é um corretor especialista em redação do ENEM. Corrija a redação abaixo seguindo ` +
    `rigorosamente a matriz de referência das 5 competências do ENEM, cada uma valendo de 0 a 200 pontos ` +
    `(múltiplos de 40: 0, 40, 80, 120, 160 ou 200):\n\n` +
    `- Competência 1: domínio da norma culta da língua escrita\n` +
    `- Competência 2: compreensão da proposta e aplicação de conhecimentos de outras áreas\n` +
    `- Competência 3: seleção, organização e interpretação de informações e argumentos\n` +
    `- Competência 4: conhecimento dos mecanismos linguísticos para argumentação (coesão)\n` +
    `- Competência 5: proposta de intervenção que respeite os direitos humanos\n\n` +
    `Tema proposto: ${tema || "Tema livre (não informado)"}\n\n` +
    `Redação do aluno:\n"""\n${texto.trim()}\n"""\n\n` +
    `Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto fora do JSON, no formato exato:\n` +
    `{"competencia_1": 0-200, "competencia_2": 0-200, "competencia_3": 0-200, "competencia_4": 0-200, ` +
    `"competencia_5": 0-200, "nota_total": soma das cinco, "feedback_geral": "string com 3-5 frases", ` +
    `"pontos_fortes": "string", "pontos_fracos": "string", "sugestoes": "string com sugestões concretas de melhoria"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(502).json({ error: `Erro ao chamar a API do Gemini: ${response.status} ${errText}` });
    }

    const data = await response.json();
    const texto2 = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto2) {
      return res.status(502).json({ error: "Resposta vazia da IA." });
    }

    const cleaned = texto2.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "A IA retornou um formato inesperado. Tente novamente." });
    }

    // Validação básica do formato antes de devolver ao cliente
    const campos = ["competencia_1", "competencia_2", "competencia_3", "competencia_4", "competencia_5", "nota_total"];
    for (const campo of campos) {
      if (typeof parsed[campo] !== "number") {
        return res.status(502).json({ error: `Resposta da IA incompleta (campo ${campo} ausente).` });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro inesperado ao corrigir a redação." });
  }
}