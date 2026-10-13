@echo off
REM ============================================================
REM  REMOVER-SIDEBAR-ORFAO.bat
REM  Remove src/components/Sidebar.tsx, o menu lateral antigo que
REM  ficou orfao no projeto desde a Opcao A (navegacao por areas).
REM  Nada mais no sistema o importa (confirmado por busca em todo
REM  o src/ e por compilacao/build/execucao real apos a remocao).
REM
REM  COMO USAR:
REM   1. Copie este .bat para a RAIZ do projeto:
REM      C:\Users\Luis Carlos\Sistemas desenvolvidos\Projetos\dataquest
REM   2. Abra o cmd nessa pasta e rode:  REMOVER-SIDEBAR-ORFAO.bat
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist ".git" (
  echo [ERRO] Esta pasta nao e um repositorio git. Coloque o .bat na raiz do projeto.
  pause & exit /b 1
)
if not exist "src\components\Sidebar.tsx" (
  echo [INFO] src\components\Sidebar.tsx ja nao existe nesta pasta. Nada a fazer.
  pause & exit /b 0
)

echo.
echo === 1/4  Branch de trabalho ===
git checkout -b chore/remover-sidebar-orfao
if errorlevel 1 (
  echo [ERRO] Nao foi possivel criar a branch. Ha alteracoes pendentes ou ela ja existe?
  pause & exit /b 1
)

echo.
echo === 2/4  Removendo src\components\Sidebar.tsx ===
git rm src\components\Sidebar.tsx
if errorlevel 1 (
  echo [ERRO] Falha ao remover o arquivo.
  pause & exit /b 1
)

echo.
echo === 3/4  Validando (tsc + build) ===
call npx tsc --noEmit
if errorlevel 1 (
  echo [ERRO] tsc encontrou erros. Nada foi commitado.
  pause & exit /b 1
)
call npm run build:web
if errorlevel 1 (
  echo [ERRO] O build falhou. Nada foi commitado.
  pause & exit /b 1
)

echo.
echo === 4/4  Commit ===
git commit -m "chore: remove src/components/Sidebar.tsx (menu lateral orfao desde a Opcao A)" -m "Substituido por src/components/navigation/AreaNav.tsx. Nada no sistema o importava (confirmado por busca em todo o src/, compilacao, build e execucao real do App inteiro apos a remocao). Sem mudanca de comportamento: o bundle final ja tinha o mesmo tamanho antes e depois, porque o bundler ja o excluia por nao fazer parte do grafo de dependencias."

echo.
echo ============================================================
echo  Concluido. Para publicar:
echo    git checkout main
echo    git merge chore/remover-sidebar-orfao
echo    git push
echo ============================================================
pause
