// src/lib/supabaseClient.js
//
// Cliente único do Supabase para todo o front-end. Importe sempre a partir
// daqui (nunca crie outra instância de createClient em outro arquivo) para
// evitar múltiplas conexões de realtime/auth em paralelo.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variáveis de ambiente ausentes: defina NEXT_PUBLIC_SUPABASE_URL e " +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local na raiz do projeto."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Mantém a sessão salva no navegador entre recarregamentos de página
    persistSession: true,
    autoRefreshToken: true,
    // Necessário para o fluxo de OAuth (Google): o Supabase lê o token da
    // URL de retorno automaticamente depois do redirect.
    detectSessionInUrl: true,
  },
});
