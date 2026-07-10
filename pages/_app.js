// pages/_app.js
//
// Ponto de entrada do Next.js (Pages Router). Envolve toda a aplicação com
// o AuthProvider, então `useAuth()` fica disponível em qualquer página.

import "../styles/globals.css";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
