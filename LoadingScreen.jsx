// src/components/LoadingScreen.jsx
//
// Tela de carregamento exibida enquanto o AuthContext resolve a sessão
// inicial (loading === true). Tema Dark Mode Premium.

export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#0d1117",
        color: "#e1e4e8",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid #30363d",
          borderTopColor: "#58a6ff",
          animation: "enemflow-spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#8b949e", fontSize: 14 }}>Carregando...</p>

      <style>{`
        @keyframes enemflow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
