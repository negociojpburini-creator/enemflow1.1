// src/lib/theme.js
//
// Tokens de design compartilhados (Ultra Dark Premium Mode) e listas de
// referência usadas por mais de um componente. Extraído de EnemFlow.jsx
// para que novos módulos (Questoes.jsx, RedacaoEditor.jsx, etc.) reutilizem
// exatamente os mesmos tokens em vez de duplicá-los.

export const C = {
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

export const DISCIPLINES = [
  "Matemática", "Física", "Química", "Biologia",
  "História", "Geografia", "Linguagens", "Filosofia/Sociologia",
];

export const DISC_COLORS = {
  "Matemática": "#58a6ff",
  "Física": "#d2a8ff",
  "Química": "#34d058",
  "Biologia": "#f2cc60",
  "História": "#f78166",
  "Geografia": "#79c0ff",
  "Linguagens": "#ff9bce",
  "Filosofia/Sociologia": "#a5a5f0",
};

export const S = {
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