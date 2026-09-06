# Handoff — Projeto DataQuest

**Data:** 05/09/2026
**Projeto local:** `C:\Users\Luis Carlos\Sistemas desenvolvidos\Projetos\dataquest`
**Produção:** https://dataquest-ten.vercel.app
**Stack:** Vite + React 19 + TypeScript, funções serverless na Vercel (`/api`), Supabase (Postgres + Auth), deploy via Vercel + GitHub.

---

## ✅ O que foi resolvido nesta sessão

### 1. Bug de deploy — `ERR_MODULE_NOT_FOUND`
- **Sintoma:** `vercel logs --follow` mostrava `Cannot find module '/var/task/api/_lib/supabaseAdmin'` ao chamar `/api/surveys`.
- **Causa:** `package.json` tem `"type": "module"`, então as funções em `/api` rodam como ESM puro no Node. O ESM nativo exige extensão `.js` nos imports relativos — diferente do CommonJS. Os imports estavam sem extensão.
- **Correção aplicada:** adicionado `.js` no final dos imports relativos em:
  - `api/health.ts`
  - `api/surveys.ts`
  - `api/surveys/[id].ts`
  - `api/surveys/[id]/sync.ts`
- **Status:** corrigido, commitado e validado em produção via `curl https://dataquest-ten.vercel.app/api/surveys` (retorna `success:true` com os dados).

### 2. Vazamento de segredos via zip
- Um dos zips enviados para avaliação incluía o arquivo `.env` real (com `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` preenchidos), porque o script `zipar-projeto.bat` não excluía `.env`.
- **Correção:** `.bat` atualizado para excluir `.env`, `.env.local`, `.env.production`, `.env.development` (além de `node_modules`, `dist`, `.git`, `.vercel`, `coverage`, `build`).
- **Ação de segurança:** migração completa para o novo sistema de chaves do Supabase:
  - Chaves legadas (`anon` / `service_role`) **desativadas** em Settings → API Keys → "Legacy anon, service_role API keys" → "Disable legacy API keys".
  - Substituídas pelas novas chaves `publishable` (`sb_publishable_...`) e `secret` (`sb_secret_...`), atualizadas no `.env` local **e** nas Environment Variables do projeto na Vercel.
  - Validado com `curl` em produção após o redeploy — tudo funcionando normalmente.
- **Pendente:** a `GEMINI_API_KEY` que estava no `.env` vazado **não foi trocada** (o usuário ainda não usa o Google AI Studio). Se/quando passar a usar, gerar uma chave nova do zero em vez de reaproveitar a antiga.

---

## ⏳ Pendências / próximos passos sugeridos

1. **Gemini API Key:** gerar uma chave nova no Google AI Studio quando for usar as funcionalidades de IA do backend (a antiga, que ficou exposta, não deve ser reaproveitada).
2. **Otimização de build (não urgente):** o `vite build` alerta que o chunk principal (`dist/assets/index-*.js`) está com ~2.1 MB (598 KB gzip), acima do limite recomendado de 500 KB. Sugestões para o futuro:
   - Usar `import()` dinâmico nos módulos maiores (ex: telas de análise/relatórios).
   - Configurar `build.rollupOptions.output.manualChunks` no `vite.config.ts`.
3. Continuar monitorando `vercel logs` após qualquer novo deploy, especialmente em endpoints ainda não testados manualmente (`/api/surveys/[id]`, `/api/surveys/[id]/sync`).

---

## 🛠️ Ferramentas/scripts entregues

- **`zipar-projeto.bat`** (na raiz do projeto): gera um zip do projeto excluindo `node_modules`, `dist`, `.git`, `.vercel`, `coverage`, `build` e todos os arquivos `.env*`. Use sempre que precisar trazer o código atualizado para avaliação.

---

## 📋 Comandos de referência rápida (cmd, Windows)

```cmd
cd "C:\Users\Luis Carlos\Sistemas desenvolvidos\Projetos\dataquest"

:: Ver logs de produção (streaming, limite de 5 min por sessão)
vercel logs https://dataquest-ten.vercel.app --follow

:: Ver deployments recentes
vercel ls dataquest

:: Testar endpoint da API
curl https://dataquest-ten.vercel.app/api/surveys

:: Forçar novo deploy sem alterar código (ex: após trocar env vars na Vercel)
git commit --allow-empty -m "chore: redeploy"
git push

:: Fluxo padrão de correção de código
git add <arquivos>
git commit -m "fix: <descricao>"
git push

:: Gerar zip atualizado do projeto para avaliação
zipar-projeto.bat
```

---

## 🔁 Como retomar esta conversa

Ao voltar, envie:
1. Este arquivo de handoff (para contexto rápido).
2. O zip mais recente gerado por `zipar-projeto.bat`, **ou** apenas o log/erro específico que quiser investigar.
