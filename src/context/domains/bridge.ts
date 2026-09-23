import type { DomainBridge } from './types';

// =============================================================================
// F3 — Ponte de comunicação entre os domínios
//
// Um único objeto mutável compartilhado. A raiz (`AppProvider`) é a única que
// ESCREVE nele; cada domínio apenas LÊ os slots de que precisa, dentro dos seus
// callbacks. Isso quebra as dependências cruzadas (Pesquisas ↔ Coletas ↔
// Cadastros) sem criar imports circulares.
//
// Fica no escopo do módulo (e não como argumento de hook) de propósito: a regra
// `react-hooks/immutability` proíbe mutar valores passados a hooks. A aplicação
// tem um único `AppProvider` (ver src/main.tsx), então um singleton é seguro.
// =============================================================================
export const domainBridge = {} as DomainBridge;
