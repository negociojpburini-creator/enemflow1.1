// pages/auth/callback.js
//
// Página de retorno do fluxo OAuth (Google). O Supabase client já lê o
// token da URL automaticamente (detectSessionInUrl: true em
// supabaseClient.js) e dispara onAuthStateChange no AuthContext — esta
// página só precisa esperar isso acontecer e então redirecionar o usuário
// para a área logada.

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../src/contexts/AuthContext";
import LoadingScreen from "../../src/components/LoadingScreen";

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/" : "/login");
    }
  }, [loading, user, router]);

  return <LoadingScreen />;
}
