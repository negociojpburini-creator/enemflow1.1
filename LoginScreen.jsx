// src/components/LoginScreen.jsx
//
// Tela de autenticação: login e cadastro com e-mail/senha, e um botão de
// "Continuar com Google". Tema Dark Mode Premium (#0d1117 / #161b22 /
// #58a6ff / #d2a8ff). Usa o AuthContext — nenhuma chamada direta ao
// Supabase acontece aqui.

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const COLORS = {
  bg: "#0d1117",
  card: "#161b22",
  border: "#30363d",
  text: "#e1e4e8",
  muted: "#8b949e",
  accent: "#58a6ff",
  accent2: "#d2a8ff",
  danger: "#f85149",
};

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("entrar"); // 'entrar' | 'criar'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "criar") {
        const data = await signUpWithEmail(email, password);
        if (!data.session) {
          setInfo("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
          setMode("entrar");
        }
        // Se a confirmação de e-mail estiver desativada no projeto, o
        // onAuthStateChange do AuthContext já detecta o login automático.
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // O navegador é redirecionado para o Google aqui; o código abaixo só
      // roda se o redirect falhar ao iniciar.
    } catch (err) {
      setError(traduzErro(err.message));
      setGoogleLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 9, background: COLORS.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: COLORS.bg, fontSize: 16,
            }}
          >
            E
          </div>
          <span style={{ fontWeight: 700, fontSize: 20 }}>EnemFlow</span>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: COLORS.bg, borderRadius: 10, padding: 4 }}>
            {[{ key: "entrar", label: "Entrar" }, { key: "criar", label: "Criar conta" }].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setMode(t.key); setError(null); setInfo(null); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  background: mode === t.key ? COLORS.card : "transparent",
                  color: mode === t.key ? COLORS.text : COLORS.muted,
                  fontWeight: 600, fontSize: 14,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ color: COLORS.muted, fontSize: 13, display: "block", marginBottom: 6 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              style={inputStyle}
            />

            <label style={{ color: COLORS.muted, fontSize: 13, display: "block", marginBottom: 6 }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              style={{ ...inputStyle, marginBottom: 18 }}
            />

            {error && <p style={{ color: COLORS.danger, fontSize: 13, marginTop: -8, marginBottom: 14 }}>{error}</p>}
            {info && <p style={{ color: "#34d058", fontSize: 13, marginTop: -8, marginBottom: 14 }}>{info}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                background: loading ? "#274361" : COLORS.accent,
                color: loading ? "#7f93ab" : COLORS.bg,
                fontWeight: 700, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Aguarde..." : mode === "criar" ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            <span style={{ color: COLORS.muted, fontSize: 12 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 10,
              border: `1px solid ${COLORS.border}`, background: "transparent",
              color: COLORS.text, fontWeight: 600, fontSize: 14,
              cursor: googleLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: googleLoading ? 0.6 : 1,
            }}
          >
            <GoogleIcon />
            {googleLoading ? "Redirecionando..." : "Continuar com Google"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.bg,
  color: COLORS.text,
  fontSize: 14,
  marginBottom: 14,
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.7-4.3-13.5-10.1H8.8v6.4C12.5 39.6 17.8 43 24 43c10.5 0 19-8.5 19-19 0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.1 8.1 3l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.7 0-14.4 4.4-17.7 11.2z" />
      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.8 13.6-4.8l-6.3-5.3c-2.1 1.4-4.8 2.2-7.3 2.2-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.5 38.5 16.2 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.9l6.3 5.3C41.4 36 44 30.5 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

// Mensagens de erro comuns da API do Supabase Auth, traduzidas.
function traduzErro(msg) {
  const map = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
  };
  return map[msg] || msg;
}
