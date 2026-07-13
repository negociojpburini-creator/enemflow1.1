// pages/api/gerar-tema.js
//
// Rota de API do Next.js (servidor). Gera um tema inédito de redação usando
// o Gemini. Antes, essa chamada era feita direto do navegador para a API da
// Anthropic — o que só funcionava no ambiente de artifact do Claude e nunca
// funcionaria de verdade em produção (exigiria expor uma chave de API no
// cliente). Movida para o servidor, junto da migração para o Gemini.

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

  const prompt =
    "Gere um tema inédito de redação seguindo rigorosamente a matriz de competências do ENEM. " +
    "O tema deve abordar debates modernos das seguintes áreas aleatórias: Avanço Tecnológico, Ética Digital, " +
    "Sustentabilidade Climática ou Dinâmicas Sociais Urbanas. Retorne SOMENTE um objeto JSON válido, sem markdown " +
    "e sem texto adicional, contendo: tema (string), ano_futuro (int), eixos_tematicos (array de strings), " +
    "proposta_contexto (string) e textos_motivadores (array com 3 textos simulados curtos, cada um como string).";

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
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) {
      return res.status(502).json({ error: "Resposta vazia da IA." });
    }

    const cleaned = texto.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "A IA retornou um formato inesperado. Tente novamente." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro inesperado ao gerar o tema." });
  }
}