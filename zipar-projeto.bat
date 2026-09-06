@echo off
REM ============================================================
REM  zipar-projeto.bat
REM  Compacta os arquivos do projeto (excluindo pastas pesadas
REM  como node_modules, dist, .git, .vercel, coverage, build)
REM  e gera um .zip com data/hora no nome, na mesma pasta.
REM
REM  Coloque este arquivo na raiz do projeto:
REM  C:\Users\Luis Carlos\Sistemas desenvolvidos\Projetos\dataquest
REM  e de um duplo-clique (ou rode pelo cmd) sempre que precisar
REM  gerar um zip atualizado para enviar para avaliacao.
REM ============================================================

setlocal

REM Vai para a pasta onde o .bat esta salvo (a raiz do projeto)
cd /d "%~dp0"

echo Gerando zip atualizado do projeto...
echo Pasta: %cd%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$staging = '.\_zip_temp';" ^
  "if (Test-Path $staging) { Remove-Item $staging -Recurse -Force };" ^
  "robocopy . $staging /E /XD node_modules dist .git .vercel coverage build _zip_temp /XF *.log *.zip .env .env.local .env.production .env.development | Out-Null;" ^
  "$dataHora = Get-Date -Format 'yyyyMMdd_HHmmss';" ^
  "$destino = \"dataquest_$dataHora.zip\";" ^
  "Compress-Archive -Path \"$staging\*\" -DestinationPath $destino -Force;" ^
  "Remove-Item $staging -Recurse -Force;" ^
  "Write-Host \"Arquivo gerado: $destino\""

echo.
echo Concluido! Envie o arquivo .zip gerado nesta pasta.
pause
