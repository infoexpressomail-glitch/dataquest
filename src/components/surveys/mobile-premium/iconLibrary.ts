// ============================================================================
// GALERIA UNIVERSAL DE ÍCONES — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Banco de ícones reutilizável. Todos os ícones vêm do Lucide React (nunca
// FontAwesome). O administrador escolhe qualquer ícone desta galeria ao criar
// a pesquisa; cada entrada possui id, nome, categoria, ícone, cor padrão e cor
// ativa. Nenhum componente externo depende deste arquivo, portanto a galeria
// pode crescer sem risco de quebrar funcionalidades existentes.
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import {
  Shield,
  ShieldCheck,
  Camera,
  DoorOpen,
  DoorClosed,
  Fence,
  TriangleAlert,
  BookOpen,
  GraduationCap,
  School,
  Presentation,
  ClipboardList,
  Brush,
  Sparkles,
  Bath,
  Trash2,
  Utensils,
  UtensilsCrossed,
  Apple,
  CupSoda,
  GlassWater,
  Bus,
  Truck,
  Car,
  Route,
  MapPin,
  UserCog,
  Phone,
  MessageCircle,
  MessageSquare,
  Users,
  Building2,
  TreePine,
  Droplets,
  Smile,
  Frown,
  Angry,
  Meh,
  Laugh,
  Star,
  Check,
  X,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
} from 'lucide-react';

export type IconCategory =
  | 'Segurança'
  | 'Escola'
  | 'Limpeza'
  | 'Alimentação'
  | 'Transporte'
  | 'Atendimento'
  | 'Infraestrutura'
  | 'Emoções'
  | 'Geral';

export interface SurveyIcon {
  id: string;
  nome: string;
  categoria: IconCategory;
  icone: LucideIcon;
  /** Cor padrão (hex) sugerida para exibição do ícone. */
  corPadrao: string;
  /** Cor ativa (hex) usada quando a alternativa está selecionada. */
  corAtiva: string;
  /** Palavras-chave extras para a busca da galeria. */
  tags?: string[];
}

export const ICON_CATEGORIES: IconCategory[] = [
  'Segurança',
  'Escola',
  'Limpeza',
  'Alimentação',
  'Transporte',
  'Atendimento',
  'Infraestrutura',
  'Emoções',
  'Geral',
];

// Paleta padrão reutilizada para manter consistência visual.
const BLUE = '#2563eb';
const BLUE_ACTIVE = '#1d4ed8';
const GREEN = '#16a34a';
const GREEN_ACTIVE = '#15803d';
const ORANGE = '#ea580c';
const ORANGE_ACTIVE = '#c2410c';
const PURPLE = '#7c3aed';
const PURPLE_ACTIVE = '#6d28d9';
const RED = '#dc2626';
const RED_ACTIVE = '#b91c1c';
const AMBER = '#d97706';
const AMBER_ACTIVE = '#b45309';
const TEAL = '#0d9488';
const TEAL_ACTIVE = '#0f766e';
const SLATE = '#475569';
const SLATE_ACTIVE = '#334155';

export const ICON_LIBRARY: SurveyIcon[] = [
  // ------------------------------ Segurança ------------------------------
  { id: 'shield', nome: 'Escudo', categoria: 'Segurança', icone: Shield, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['protecao', 'seguro'] },
  { id: 'shield-check', nome: 'Escudo Verificado', categoria: 'Segurança', icone: ShieldCheck, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['protecao', 'check'] },
  { id: 'camera', nome: 'Câmera', categoria: 'Segurança', icone: Camera, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['monitoramento', 'video'] },
  { id: 'gate-open', nome: 'Portão', categoria: 'Segurança', icone: DoorOpen, corPadrao: AMBER, corAtiva: AMBER_ACTIVE, tags: ['entrada', 'acesso'] },
  { id: 'gate-closed', nome: 'Portão Fechado', categoria: 'Segurança', icone: DoorClosed, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['saida'] },
  { id: 'fence', nome: 'Cerca', categoria: 'Segurança', icone: Fence, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['muro', 'limite'] },
  { id: 'alert', nome: 'Alerta', categoria: 'Segurança', icone: TriangleAlert, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['aviso', 'perigo'] },

  // -------------------------------- Escola -------------------------------
  { id: 'book', nome: 'Livro', categoria: 'Escola', icone: BookOpen, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['leitura', 'estudo'] },
  { id: 'teacher', nome: 'Professor', categoria: 'Escola', icone: GraduationCap, corPadrao: PURPLE, corAtiva: PURPLE_ACTIVE, tags: ['docente', 'aula'] },
  { id: 'school', nome: 'Escola', categoria: 'Escola', icone: School, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['sala', 'ensino'] },
  { id: 'board', nome: 'Quadro', categoria: 'Escola', icone: Presentation, corPadrao: TEAL, corAtiva: TEAL_ACTIVE, tags: ['lousa', 'apresentacao'] },
  { id: 'clipboard', nome: 'Prancheta', categoria: 'Escola', icone: ClipboardList, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['lista', 'tarefa'] },

  // ------------------------------- Limpeza -------------------------------
  { id: 'broom', nome: 'Vassoura', categoria: 'Limpeza', icone: Brush, corPadrao: AMBER, corAtiva: AMBER_ACTIVE, tags: ['limpar', 'faxina'] },
  { id: 'sparkle', nome: 'Brilho', categoria: 'Limpeza', icone: Sparkles, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['limpo', 'brilhante'] },
  { id: 'restroom', nome: 'Banheiro', categoria: 'Limpeza', icone: Bath, corPadrao: TEAL, corAtiva: TEAL_ACTIVE, tags: ['sanitario', 'wc'] },
  { id: 'trash', nome: 'Lixeira', categoria: 'Limpeza', icone: Trash2, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['lixo', 'residuo'] },

  // ----------------------------- Alimentação -----------------------------
  { id: 'plate', nome: 'Prato', categoria: 'Alimentação', icone: UtensilsCrossed, corPadrao: ORANGE, corAtiva: ORANGE_ACTIVE, tags: ['refeicao', 'comida'] },
  { id: 'cutlery', nome: 'Talheres', categoria: 'Alimentação', icone: Utensils, corPadrao: ORANGE, corAtiva: ORANGE_ACTIVE, tags: ['garfo', 'faca'] },
  { id: 'apple', nome: 'Maçã', categoria: 'Alimentação', icone: Apple, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['fruta', 'saudavel'] },
  { id: 'cup', nome: 'Copo', categoria: 'Alimentação', icone: CupSoda, corPadrao: TEAL, corAtiva: TEAL_ACTIVE, tags: ['bebida', 'agua'] },
  { id: 'water', nome: 'Água', categoria: 'Alimentação', icone: GlassWater, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['hidratacao'] },

  // ------------------------------ Transporte -----------------------------
  { id: 'bus', nome: 'Ônibus', categoria: 'Transporte', icone: Bus, corPadrao: AMBER, corAtiva: AMBER_ACTIVE, tags: ['coletivo', 'escolar'] },
  { id: 'van', nome: 'Van', categoria: 'Transporte', icone: Truck, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['kombi', 'veiculo'] },
  { id: 'car', nome: 'Carro', categoria: 'Transporte', icone: Car, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['automovel'] },
  { id: 'route', nome: 'Rota', categoria: 'Transporte', icone: Route, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['caminho', 'trajeto'] },
  { id: 'location', nome: 'Localização', categoria: 'Transporte', icone: MapPin, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['mapa', 'endereco'] },

  // ----------------------------- Atendimento -----------------------------
  { id: 'secretary', nome: 'Secretaria', categoria: 'Atendimento', icone: UserCog, corPadrao: PURPLE, corAtiva: PURPLE_ACTIVE, tags: ['atendente', 'recepcao'] },
  { id: 'phone', nome: 'Telefone', categoria: 'Atendimento', icone: Phone, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['ligacao', 'contato'] },
  { id: 'balloon', nome: 'Balão', categoria: 'Atendimento', icone: MessageCircle, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['mensagem', 'conversa'] },
  { id: 'chat', nome: 'Conversa', categoria: 'Atendimento', icone: MessageSquare, corPadrao: TEAL, corAtiva: TEAL_ACTIVE, tags: ['dialogo'] },
  { id: 'people', nome: 'Pessoas', categoria: 'Atendimento', icone: Users, corPadrao: PURPLE, corAtiva: PURPLE_ACTIVE, tags: ['equipe', 'comunidade'] },

  // --------------------------- Infraestrutura ----------------------------
  { id: 'building', nome: 'Prédio', categoria: 'Infraestrutura', icone: Building2, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['edificio', 'predio'] },
  { id: 'tree', nome: 'Árvore', categoria: 'Infraestrutura', icone: TreePine, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['natureza', 'verde'] },
  { id: 'fountain', nome: 'Bebedouro', categoria: 'Infraestrutura', icone: Droplets, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['agua', 'fonte'] },
  { id: 'infra-restroom', nome: 'Banheiro', categoria: 'Infraestrutura', icone: Bath, corPadrao: TEAL, corAtiva: TEAL_ACTIVE, tags: ['sanitario'] },

  // -------------------------------- Emoções ------------------------------
  { id: 'happy', nome: 'Feliz', categoria: 'Emoções', icone: Smile, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['alegre', 'bom'] },
  { id: 'sad', nome: 'Triste', categoria: 'Emoções', icone: Frown, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['ruim', 'tristeza'] },
  { id: 'angry', nome: 'Bravo', categoria: 'Emoções', icone: Angry, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['raiva', 'irritado'] },
  { id: 'neutral', nome: 'Neutro', categoria: 'Emoções', icone: Meh, corPadrao: SLATE, corAtiva: SLATE_ACTIVE, tags: ['indiferente', 'regular'] },
  { id: 'excellent', nome: 'Excelente', categoria: 'Emoções', icone: Laugh, corPadrao: AMBER, corAtiva: AMBER_ACTIVE, tags: ['otimo', 'melhor'] },
  { id: 'star', nome: 'Estrela', categoria: 'Emoções', icone: Star, corPadrao: AMBER, corAtiva: AMBER_ACTIVE, tags: ['favorito', 'nota'] },

  // --------------------------------- Geral --------------------------------
  { id: 'check', nome: 'Check', categoria: 'Geral', icone: Check, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['sim', 'correto'] },
  { id: 'x', nome: 'X', categoria: 'Geral', icone: X, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['nao', 'errado'] },
  { id: 'question', nome: 'Interrogação', categoria: 'Geral', icone: HelpCircle, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['duvida', 'ajuda'] },
  { id: 'like', nome: 'Curtir', categoria: 'Geral', icone: ThumbsUp, corPadrao: GREEN, corAtiva: GREEN_ACTIVE, tags: ['gostei', 'positivo'] },
  { id: 'dislike', nome: 'Descurtir', categoria: 'Geral', icone: ThumbsDown, corPadrao: RED, corAtiva: RED_ACTIVE, tags: ['nao gostei', 'negativo'] },
  { id: 'bookmark', nome: 'Salvar', categoria: 'Geral', icone: Bookmark, corPadrao: BLUE, corAtiva: BLUE_ACTIVE, tags: ['favorito'] },
  { id: 'share', nome: 'Compartilhar', categoria: 'Geral', icone: Share2, corPadrao: PURPLE, corAtiva: PURPLE_ACTIVE, tags: ['enviar'] },
];

const ICON_BY_ID = new Map<string, SurveyIcon>(ICON_LIBRARY.map((i) => [i.id, i]));

/** Retorna um ícone da galeria pelo id (ou undefined). */
export function getIconById(id?: string): SurveyIcon | undefined {
  if (!id) return undefined;
  return ICON_BY_ID.get(id);
}

/** Busca textual + filtro por categoria (usada no painel da galeria do Wizard). */
export function searchIcons(query: string, categoria?: IconCategory | 'todas'): SurveyIcon[] {
  const q = query.trim().toLowerCase();
  return ICON_LIBRARY.filter((icon) => {
    const okCat = !categoria || categoria === 'todas' || icon.categoria === categoria;
    if (!okCat) return false;
    if (!q) return true;
    const haystack = [icon.nome, icon.categoria, ...(icon.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

/** Paleta sugerida para os campos de cor do construtor de perguntas. */
export const VISUAL_COLOR_PALETTE = [
  '#0b4a8f', '#2563eb', '#0ea5e9', '#0d9488', '#16a34a',
  '#65a30d', '#d97706', '#ea580c', '#dc2626', '#db2777',
  '#7c3aed', '#4f46e5', '#475569', '#111827', '#ffffff',
];
