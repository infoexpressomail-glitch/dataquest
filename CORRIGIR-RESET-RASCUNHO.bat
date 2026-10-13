@echo off
REM ============================================================
REM  CORRIGIR-RESET-RASCUNHO.bat
REM  Corrige uma pequena regressao da divisao do AppContext em
REM  dominios (F3): "Restaurar dados originais" zerava o rascunho
REM  de pesquisa em memoria, mas deixava o registro orfao no
REM  IndexedDB do navegador do usuario.
REM
REM  COMO USAR:
REM   1. Copie a pasta "arquivos" e este .bat para a RAIZ do projeto:
REM      C:\Users\Luis Carlos\Sistemas desenvolvidos\Projetos\dataquest
REM   2. Abra o cmd nessa pasta e rode:  CORRIGIR-RESET-RASCUNHO.bat
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist ".git" (
  echo [ERRO] Esta pasta nao e um repositorio git. Coloque o .bat na raiz do projeto.
  pause & exit /b 1
)
if not exist "arquivos\src\context\AppContext.tsx" (
  echo [ERRO] Pasta "arquivos" nao encontrada ao lado deste .bat.
  pause & exit /b 1
)

echo.
echo === 1/4  Branch de trabalho ===
git checkout -b fix/reset-limpa-rascunho-indexeddb
if errorlevel 1 (
  echo [ERRO] Nao foi possivel criar a branch. Ha alteracoes pendentes ou ela ja existe?
  pause & exit /b 1
)

echo.
echo === 2/4  Copiando o arquivo ===
copy /Y "arquivos\src\context\AppContext.tsx" "src\context\AppContext.tsx" >nul
if errorlevel 1 (
  echo [ERRO] Falha ao copiar.
  pause & exit /b 1
)

echo.
echo === 3/4  Conferindo (esperado: 1 arquivo modificado) e validando ===
git status --short
git diff --stat
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
git add src/context/AppContext.tsx
git commit -m "fix(f3): resetToDefaults agora limpa o rascunho no IndexedDB, nao so em memoria" -m "resetOfflineCacheState() (ColetasDomain) zera o estado React do rascunho mas nao apaga o registro fisico salvo em IndexedDB (chave fixa active_current_draft). Sem esta chamada, o rascunho antigo ficava orfao no navegador do usuario ate ser sobrescrito pelo proximo rascunho salvo. Chama coletas.clearCurrentSurveyDraft(), que ja existia no dominio e faz as duas coisas."

echo.
echo ============================================================
echo  Concluido. Para publicar:
echo    git checkout main
echo    git merge fix/reset-limpa-rascunho-indexeddb
echo    git push
echo ============================================================
pause
