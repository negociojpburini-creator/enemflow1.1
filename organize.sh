# (#!/usr/bin/env bash
# Reorganiza os arquivos soltos do EnemFlow na estrutura correta do Next.js 14.
# Rode este script na RAIZ do projeto (onde estão os arquivos soltos hoje),
# por exemplo: /workspaces/enemflow1.1
set -e

echo "Criando estrutura de pastas..."
mkdir -p pages/auth
mkdir -p src/lib src/contexts src/components
mkdir -p styles public

move() {
  if [ -f "$1" ]; then
    mv -v "$1" "$2"
  else
    echo "Aviso: '$1' não encontrado na pasta atual — pulei."
  fi
}

echo "Movendo arquivos de pages/..."
move "index.js" "pages/index.js"
move "_app.js" "pages/_app.js"
move "callback.js" "pages/auth/callback.js"

echo "Movendo arquivos de src/..."
move "supabaseClient.js" "src/lib/supabaseClient.js"
move "AuthContext.js" "src/contexts/AuthContext.js"
move "EnemFlow.jsx" "src/components/EnemFlow.jsx"
move "LoginScreen.jsx" "src/components/LoginScreen.jsx"
move "LoadingScreen.jsx" "src/components/LoadingScreen.jsx"

echo "Movendo estáticos..."
move "globals.css" "styles/globals.css"
move "favicon.svg" "public/favicon.svg"

echo ""
echo "Estrutura final:"
find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | sort

echo ""
echo "Pronto! Agora rode:  npm install && npm run dev")
