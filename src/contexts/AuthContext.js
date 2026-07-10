// src/contexts/AuthContext.js
//
// Provider de autenticação global. Envolva sua aplicação com <AuthProvider>
// (veja pages/_app.js) e use o hook `useAuth()` em qualquer componente para
// acessar o usuário logado, o perfil e as funções de autenticação.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Busca a linha de public.profiles referente ao usuário logado.
  // Essa linha já é criada automaticamente pelo trigger handle_new_user()
  // no banco assim que a conta é criada, então normalmente já existe aqui.
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar perfil:", error.message);
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1) Carrega a sessão já existente (ex.: após F5 na página)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2) Escuta mudanças de autenticação (login, logout, refresh de token,
    //    retorno do fluxo OAuth do Google, etc.)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ---------------------------------------------------------------------
  // Cadastro com e-mail e senha
  // ---------------------------------------------------------------------
  async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  // ---------------------------------------------------------------------
  // Login com e-mail e senha
  // ---------------------------------------------------------------------
  async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // ---------------------------------------------------------------------
  // Login com Google (OAuth). Redireciona o navegador para o Google e
  // depois de volta para /auth/callback (veja pages/auth/callback.js).
  // Pré-requisito: habilitar o provedor Google em Authentication →
  // Providers no painel do Supabase, com Client ID/Secret do Google Cloud.
  // ---------------------------------------------------------------------
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }

  // ---------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  // ---------------------------------------------------------------------
  // Salva as respostas do quiz de onboarding em public.profiles
  //
  // Nomes de coluna alinhados ao schema já criado no banco (mesmas chaves
  // usadas pelo componente Onboarding em EnemFlow.jsx): foco, tempo,
  // historico, fraqueza, meta.
  // ---------------------------------------------------------------------
  async function updateOnboardingProfile(formData) {
    if (!user) throw new Error("Nenhum usuário logado.");

    const payload = {
      id: user.id,
      email: user.email,
      foco: formData.foco,
      tempo: formData.tempo,
      historico: formData.historico,
      fraqueza: formData.fraqueza,
      meta: formData.meta,
    };

    // upsert (não update): contas criadas antes da trigger handle_new_user
    // estar configurada podem não ter uma linha em profiles ainda. upsert
    // cria a linha se não existir e atualiza se já existir — funciona nos
    // dois casos, sem depender da trigger ter rodado.
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }

  const value = {
    user,
    profile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    updateOnboardingProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>.");
  }
  return context;
}