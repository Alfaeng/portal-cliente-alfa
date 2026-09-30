export type NivelAcesso = "editor_obras" | "editor_completo" | "administrador";
export type StatusCampanha = "ativa" | "pausada";
export type ConviteStatus = "pendente" | "ativo";

export interface Cliente {
  id: string;
  /** CPF só aparece mascarado (***.123.456-**). O número completo não é guardado. */
  cpf_mascarado: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  importado_em: string;
  updated_at: string;
}

export interface Empreendimento {
  id: string;
  slug: string;
  nome: string;
  bairro: string;
  cidade: string;
  estado: string;
  logo_url: string | null;
  texto_atualizacao: string;
  avanco_geral: number;
  atualizado_em: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface EmpreendimentoEtapa {
  id: string;
  empreendimento_id: string;
  nome: string;
  percentual: number;
  ordem: number;
  updated_at: string;
}

export interface Foto {
  id: string;
  empreendimento_id: string;
  storage_path: string;
  url: string;
  ordem: number;
  created_at: string;
  deleted_at: string | null;
}

export interface CampanhaPesquisa {
  id: string;
  pergunta: string;
  status: StatusCampanha;
  oculta: boolean;
  periodo_inicio: string;
  periodo_fim: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RespostaPesquisa {
  id: string;
  campanha_id: string;
  cliente_id: string | null;
  nota: number;
  created_at: string;
}

export interface RespostaPesquisaComCliente extends RespostaPesquisa {
  cliente: { nome: string; cpf_mascarado: string | null } | null;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  nivel_acesso: NivelAcesso;
  convite_status: ConviteStatus;
  convidado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampanhaComEstatisticas extends CampanhaPesquisa {
  media: number;
  total_respostas: number;
  distribuicao: [number, number, number, number, number]; // contagem de 1..5 estrelas
}
