# EnemFlow

App de estudos para o ENEM: diagnóstico inicial, simulados com timer, painel
de desempenho, módulo de redação e autenticação real via Supabase (e-mail/senha
e Google).

## Stack

- **Next.js 14** (Pages Router)
- **React 18**
- **@supabase/supabase-js v2** — autenticação e banco de dados
- **recharts** — gráficos do painel de desempenho
- **lucide-react** — ícones

## Estrutura do projeto

```
enemflow/
├── .env.local              # suas credenciais reais (não versionado)
├── .env.local.example      # modelo do .env.local
├── next.config.js
├── jsconfig.json
├── package.json
├── public/
│   └── favicon.svg
├── styles/
│   └── globals.css
├── pages/
│   ├── _app.js             # envolve o app com <AuthProvider>
│   ├── index.js            # página inicial (login / loading / conteúdo)
│   └── auth/
│       └── callback.js     # retorno do fluxo OAuth do Google
└── src/
    ├── lib/
    │   └── supabaseClient.js   # cliente único do Supabase
    ├── contexts/
    │   └── AuthContext.js      # estado global de autenticação
    └── components/
        ├── EnemFlow.jsx        # app completo (dashboard, simulado, redação)
        ├── LoginScreen.jsx      # tela de login/cadastro
        └── LoadingScreen.jsx    # tela de carregamento
```

## Rodando no GitHub Codespaces (ou localmente)

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente.** O arquivo `.env.local` já vem
   preenchido com as credenciais do projeto Supabase usado durante o
   desenvolvimento. Se for usar outro projeto, copie o modelo:
   ```bash
   cp .env.local.example .env.local
   ```
   e preencha:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
   ```
   Essas duas variáveis ficam em **Project Settings → API** no painel do
   Supabase.

3. **Rode as migrações do banco.** No SQL Editor do seu projeto Supabase,
   execute o script de schema mais recente que você já tem (tabelas
   `profiles`, `simulados_historico`, `questoes`, `redacoes_temas`,
   `enem_curiosidades`, RLS e triggers de `handle_new_user`).

4. **Suba o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abra `http://localhost:3000`.

5. **Login com Google (opcional):** para o botão "Continuar com Google"
   funcionar, habilite o provedor Google em *Authentication → Providers* no
   painel do Supabase (com Client ID/Secret do Google Cloud Console) e
   adicione `http://localhost:3000/auth/callback` em *Authentication → URL
   Configuration → Redirect URLs*.

## Observação importante sobre `src/components/EnemFlow.jsx`

Esse arquivo contém o aplicativo completo (onboarding, simulado, painel,
redação) e tem **seu próprio sistema interno de autenticação e acesso ao
Supabase** (chamadas `fetch` diretas à API REST do GoTrue/PostgREST) — ele
não usa o `AuthContext`/`LoginScreen`/`LoadingScreen` deste scaffold.

Isso significa que hoje existem **dois sistemas de autenticação
independentes** no projeto:

1. `AuthContext.js` + `LoginScreen.jsx` + `LoadingScreen.jsx` + `callback.js`
   — usando o SDK oficial `@supabase/supabase-js`, já conectado em
   `pages/index.js`.
2. A autenticação embutida dentro de `EnemFlow.jsx` — via `fetch` direto,
   independente do `AuthContext`.

`pages/index.js` hoje **não renderiza** `EnemFlow.jsx` — ele mostra uma
página de exemplo mais simples. Mantive assim de propósito, para não alterar
a lógica de nenhum dos arquivos que você já tinha. Se quiser, no próximo
passo eu posso:

- Unificar os dois sistemas de auth em um só (recomendado), ou
- Só trocar o conteúdo logado de `pages/index.js` para renderizar
  `<EnemFlow />` sem mexer no restante.

Me avise qual caminho prefere.
