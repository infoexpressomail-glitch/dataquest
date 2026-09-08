export type Language = 'pt' | 'en' | 'es';

export type UserRole = 'ADMIN' | 'COORDENADOR' | 'PESQUISADOR' | 'ANALISTA';

export interface AccessPolicyPermissions {
  // Cadastro de Colaboradores
  colaboradores_alterar_senha: boolean;
  colaboradores_desativar: boolean;
  colaboradores_editar: boolean;
  colaboradores_acesso: boolean;
  colaboradores_incluir: boolean;

  // Módulo de Análise de Resultados
  analise_acesso: boolean;
  analise_criar_alterar_excluir_resposta: boolean;

  // Módulo de Importação Externa
  importacao_importar_planilha: boolean;
  importacao_excluir: boolean;
  importacao_acesso: boolean;

  // Módulo de Meta
  meta_criar_alterar_excluir: boolean;
  meta_acesso: boolean;

  // Módulo de Pesquisa
  pesquisa_visualizar_excluidas: boolean;
  pesquisa_acesso: boolean;
  pesquisa_criar: boolean;
  pesquisa_alterar: boolean;
  pesquisa_excluir: boolean;
  pesquisa_ouvir_audio: boolean;
  pesquisa_visualizar_georeferenciamento: boolean;
  pesquisa_exportar_resultados: boolean;
  pesquisa_visualizar_inativas: boolean;
  pesquisa_replicar: boolean;
  pesquisa_desativar: boolean;
  pesquisa_acessa_todas_sem_associacao: boolean;
  pesquisa_alteracao_resposta_espontanea: boolean;

  // Módulo de Visualização de Respostas
  respostas_acesso: boolean;
  respostas_alterar: boolean;

  // Módulo Home
  home_acesso: boolean;
  home_visualiza_paineis_superiores: boolean;
  home_visualiza_conexoes_recentes: boolean;

  // Políticas de Acesso
  politicas_acesso: boolean;

  // Módulo de Relatórios Analíticos
  relatorios_acesso: boolean;
  relatorios_criar_alterar_excluir: boolean;
}

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  permissions: AccessPolicyPermissions;
}

export interface Collaborator {
  id: string;
  // Dados Pessoais
  cpf: string;
  nome: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: 'M' | 'F' | 'Outro' | '';
  // Dados de Acesso
  login: string;
  senha?: string;
  perfilAcessoId: string;
  email: string;
  // Telefones de Contato
  celular?: string;
  nomeContatoCelular?: string;
  telefoneFixo?: string;
  nomeContatoFixo?: string;
  // Metadados
  ativo: boolean;
  pesquisasVinculadasIds: string[];
  criadoEm: string;
}

export type QuestionType =
  | 'multipla_escolha'
  | 'multipla_selecao'
  | 'texto_aberto'
  | 'escala_numerica'
  | 'nps'
  | 'sim_nao'
  | 'data_hora';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;
  codigo: string;
  enunciado: string;
  tipo: QuestionType;
  obrigatoria: boolean;
  opcoes?: QuestionOption[];
  escalaMin?: number;
  escalaMax?: number;
  escalaMinLabel?: string;
  escalaMaxLabel?: string;
  ordem: number;
  iniciarGravacaoAqui?: boolean; // Flag: Iniciar a gravação de áudio a partir desta pergunta
}

export type ConditionOperator = 'igual' | 'diferente' | 'contem' | 'maior_que' | 'menor_que';

export type ConditionActionType =
  | 'saltar_para'
  | 'esconder_pergunta'
  | 'finalizar_formulario';

export interface ConditionalRule {
  id: string;
  perguntaOrigemId: string; // Pergunta analisada
  condicao: ConditionOperator;
  valorComparacao: string; // Respostas conforme condição
  acao: ConditionActionType;
  perguntaDestinoId?: string; // Para saltar ou esconder
  descricao?: string;
}

export interface MetaTarget {
  id: string;
  pesquisaId: string;
  perguntaId: string; // Questão
  condicao: ConditionOperator; // Condição
  resposta: string; // Resposta
  quantidadeAlvo: number;
  quantidadeAtingida: number;
  ciclo: string;
}

export type DemographicDimension = 'idade' | 'sexo' | 'bairro';

export interface DemographicQuotaCriteria {
  faixaEtaria?: string; // Ex: '18 a 25 anos', '26 a 40 anos', '41 a 60 anos', 'Acima de 60 anos', 'Todas'
  sexo?: 'M' | 'F' | 'Outro' | 'Todos' | 'Feminino' | 'Masculino';
  bairro?: string; // Ex: 'Centro', 'Praça da Matriz', 'Zona Norte', 'UBS Central', 'Todos'
}

export interface ResearcherQuotaAssignment {
  pesquisadorId: string;
  pesquisadorNome: string;
  perfilAcessoNome?: string;
  cotaAlvo: number; // Quantidade atribuída especificamente a esse pesquisador
  cotaAtingida: number; // Quantidade realizada em tempo real por esse pesquisador
  dataAtribuicao: string;
}

export interface GlobalDemographicTarget {
  id: string;
  pesquisaId: string;
  titulo: string; // Ex: "Amostragem Jovens - Praça da Matriz", "Cota Feminina Geral"
  descricao?: string;
  criterios: DemographicQuotaCriteria;
  metaGlobalAlvo: number; // Meta total somada ou alvo geral da pesquisa
  metaGlobalAtingida: number; // Total coletado em tempo real em toda a pesquisa
  atribuicoes: ResearcherQuotaAssignment[]; // Vínculo com perfis/pesquisadores específicos
  status: 'ativa' | 'concluida' | 'pausada';
  ciclo?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Survey {
  id: string;
  codigo: string;
  nome: string; // ex: "LiterArraial 2025 - Prefeitura"
  descricao: string;
  status: 'ativa' | 'inativa' | 'excluida';
  habilitarColetaWeb: boolean;
  tipoColetaWeb: 'publico' | 'interno';
  colaboradorWebId?: string; // Pesquisador atribuído para registros web
  perguntas: Question[];
  regras: ConditionalRule[];
  metas: MetaTarget[];
  metasGlobais?: GlobalDemographicTarget[]; // Gerenciamento de Metas Globais por Demografia
  pesquisadoresIds: string[]; // Pesquisadores que irão participar
  cicloAtual: number;
  versao: number;
  criadaEm: string;
  atualizadaEm: string;
  dataInicio?: string; // Data de início do campo (YYYY-MM-DD)
  dataFim?: string; // Data limite/término do campo (YYYY-MM-DD)
  // Plano Amostral e Dimensionamento de Equipe em Campo
  metaTotalColetas?: number; // Meta total estabelecida de coletas (amostra total N)
  nivelConfiancaPercentual?: number; // Nível/margem de confiança (padrão: 95%)
  margemErroPercentual?: number; // Margem de erro máxima aceitável (padrão: ±3.5%)
  populacaoUniverso?: number; // População total finita (universo amostral, opcional)
  metaSexoMasculino?: number; // Quota de sexo masculino (soma com feminino = total de coletas)
  metaSexoFeminino?: number; // Quota de sexo feminino (soma com masculino = total de coletas)
  metaSexoOutro?: number; // Quota de sexo outro/não binário
  diasPrevistosCampo?: number; // Dias úteis estimados para o trabalho de campo (padrão: 3 a 5)
  mediaColetasDiaPesquisador?: number; // Capacidade média diária por pesquisador (padrão: 15 entrevistas/dia)
  reservaTecnicaPercentual?: number; // Margem de segurança de amostragem (padrão: 15%)
  // Configurações de Gravação de Áudio de Campo
  habilitarGravacaoAudio?: boolean; // Padrão true
  gravarAudioAPartirPerguntaId?: string; // ID da pergunta a partir de onde será gravada (se vazio, grava desde o início)
  tempoLimiteGravacaoMinutos?: number; // Padrão: 2 minutos quando não especificado, máximo 10 minutos (1 a 10 min)
  // Campos de Sincronização com o Servidor Central
  emAndamento?: boolean; // Indica se a pesquisa está em andamento (coletando dados / em campo)
  serverVersion?: number; // Versão persistida no servidor
  serverSyncToken?: string; // Token de pré-sincronização emitido pelo servidor para autorizar upload
  lastServerSyncAt?: string; // Carimbo da última sincronização prévia com o servidor
  serverSyncStatus?: 'sincronizado' | 'necessita_sincronizacao' | 'sincronizando' | 'autorizado_para_subir' | 'erro_conflito';
  totalEntrevistasColetadas?: number; // Total de coletas vinculadas no servidor
}

export interface ServerSyncCheckResult {
  success: boolean;
  emAndamento: boolean;
  serverVersion: number;
  syncToken?: string;
  expiresAt?: string;
  submissionsCount: number;
  message: string;
  divergences?: string[];
  serverSurvey?: Survey;
}

/**
 * Bloco livre de um Relatório Analítico. O usuário monta quantos blocos
 * quiser, cada um com seu próprio título; "origem" só existe para fins de
 * exibição (ícone/rótulo de "gerado automaticamente"), nunca restringe o
 * conteúdo ou a estrutura do relatório.
 */
export interface ReportBlock {
  id: string;
  titulo: string;
  conteudo: string; // texto livre (markdown simples: **negrito**, listas com "- ")
  ordem: number;
  origem: 'automatico_quantitativo' | 'automatico_qualitativo' | 'manual';
  criadoEm: string;
  atualizadoEm: string;
}

export interface AnalyticalReport {
  id: string;
  pesquisaId: string;
  pesquisaNome: string;
  titulo: string;
  blocos: ReportBlock[];
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AnswerItem {
  perguntaId: string;
  perguntaCodigo: string;
  perguntaEnunciado: string;
  resposta: string | string[];
}

export interface InterviewSubmission {
  id: string;
  codigoPesquisa: string;
  pesquisaId: string;
  pesquisaNome: string;
  pesquisadorId: string;
  pesquisadorNome: string;
  dataHora: string; // ISO format
  status: 'concluida' | 'em_andamento' | 'cancelada';
  respostas: AnswerItem[];
  // Detalhes extras de campo
  geolocalizacao?: {
    latitude: number;
    longitude: number;
    bairro?: string;
    cidade?: string;
  };
  audioGravacao?: {
    duracaoSegundos: number;
    tamanhoKb: number;
    nomeArquivo: string;
    transcricaoTrecho?: string;
    audioUrl?: string; // Data URL ou Blob URL para reprodução e exportação
    iniciouNaPerguntaCodigo?: string; // Código da pergunta onde a gravação foi iniciada
    tempoConfiguradoMinutos?: number; // Tempo máximo configurado (padrão 2 min, máx 10 min)
  };
  respostasAlteradasPeloAdmin?: boolean;
  historicoEdicao?: {
    alteradoPor: string;
    dataHora: string;
    motivo: string;
  }[];
}

export interface RecentConnection {
  id: string;
  usuario: string;
  perfil: string;
  ip: string;
  dataHora: string;
  navegador: string;
  status: 'sucesso' | 'bloqueado' | 'aviso';
}

export interface ExternalImport {
  id: string;
  nomeArquivo: string;
  pesquisaId: string;
  dataImportacao: string;
  totalRegistros: number;
  colunas: string[];
  status: 'concluido' | 'processando' | 'erro';
}

export type ActionCategory = 'PESQUISA' | 'RESPOSTA' | 'CONFIGURACAO' | 'SISTEMA';

export type ActionType =
  | 'CRIACAO_PESQUISA'
  | 'EDICAO_PESQUISA'
  | 'STATUS_PESQUISA'
  | 'REPLICACAO_PESQUISA'
  | 'EXCLUSAO_PESQUISA'
  | 'RESTAURACAO_PESQUISA'
  | 'EDICAO_RESPOSTA'
  | 'EXCLUSAO_RESPOSTA'
  | 'NOVA_COLETA'
  | 'ALTERACAO_META'
  | 'IMPORTACAO_DADOS'
  | 'ACAO_EM_LOTE'
  | 'SINCRONIZACAO_OFFLINE'
  | 'CRIACAO_RELATORIO'
  | 'EDICAO_RELATORIO'
  | 'EXCLUSAO_RELATORIO';

export interface FieldChange {
  campo: string;
  rotulo?: string;
  valorAnterior?: string | number | boolean | null;
  valorNovo?: string | number | boolean | null;
}

export interface ActionAuditLog {
  id: string;
  categoria: ActionCategory;
  tipoAcao: ActionType;
  tituloAcao: string;
  descricaoDetalhada: string;
  // Quem
  autor: {
    id: string;
    nome: string;
    login: string;
    perfil: string;
    ip?: string;
  };
  // O quê
  alvo: {
    tipo: 'pesquisa' | 'resposta' | 'meta' | 'importacao' | 'sistema' | 'colaborador' | 'relatorio';
    id: string;
    identificador: string;
    nome?: string;
  };
  alteracoes?: FieldChange[];
  motivoConformidade?: string;
  // Quando
  timestamp: string;
  // Conformidade
  hashIntegridade: string;
  statusConformidade: 'conforme' | 'atencao' | 'critico';
}

export interface OfflineSyncItem {
  id: string;
  tipo: 'PESQUISA_SALVA' | 'RESPOSTA_COLETA';
  titulo: string;
  resumo: string;
  dataCriacao: string;
  status: 'pendente' | 'sincronizando' | 'sincronizado' | 'erro';
  payload: any;
  erroMensagem?: string;
}

export interface DailyCollectionMetric {
  dataIso: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  diaSemana: string; // Seg, Ter, Qua, etc.
  totalEntrevistas: number;
  pesquisadoresAtivos: string[];
  tempoMedioMinutos: number;
  metaDiaria: number;
  atingimentoPercentual: number;
  concluidas: number;
  canceladas: number;
}

export interface SyncProgressItem {
  id: string;
  nome: string;
  codigo: string;
  status: 'pending' | 'syncing' | 'success' | 'failed';
  error?: string;
}

export interface SyncProgressState {
  isActive: boolean;
  phase: 'idle' | 'detecting' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  currentSurveyName?: string;
  percent: number;
  message: string;
  mode?: 'live' | 'simulated';
  startedAt?: string;
  completedAt?: string;
  failedCount?: number;
  syncedItems: SyncProgressItem[];
}
