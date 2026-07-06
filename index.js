// pages/index.js
//
// Exemplo de como consumir o AuthContext em uma página real: mostra a tela
// de loading enquanto a sessão inicial é resolvida, a tela de login se não
// houver usuário, e o conteúdo logado (com aviso de onboarding pendente)
// caso contrário. Adapte o "conteúdo logado" para o dashboard real do app.

import { useAuth } from "../src/contexts/AuthContext";
import LoadingScreen from "../src/components/LoadingScreen";
import LoginScreen from "../src/components/LoginScreen";

const COLORS = {
  bg: "#0d1117",
  card: "#161b22",
  border: "#30363d",
  text: "#e1e4e8",
  muted: "#8b949e",
  accent: "#58a6ff",
};

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  const onboardingPendente = !profile?.foco_carreira;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card,
      }}>
        <span style={{ fontWeight: 700 }}>EnemFlow</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: COLORS.muted, fontSize: 13 }}>{user.email}</span>
          <button
            onClick={signOut}
            style={{
              padding: "7px 12px", borderRadius: 9, border: `1px solid ${COLORS.border}`,
              background: "transparent", color: COLORS.text, cursor: "pointer", fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
        {onboardingPendente ? (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Complete seu diagnóstico inicial</h2>
            <p style={{ color: COLORS.muted }}>
              Ainda não encontramos suas respostas do quiz de onboarding. Ligue o formulário de
              diagnóstico à função <code>updateOnboardingProfile</code> do AuthContext para salvá-las.
            </p>
          </div>
        ) : (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Bem-vindo(a) de volta</h2>
            <p style={{ color: COLORS.muted }}>
              Foco: {profile.foco_carreira} · Meta: {profile.meta_pontuacao}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
