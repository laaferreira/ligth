export interface Fornecedor {
  id?: number;
  nome: string;
  razaoSocial: string;
  cnpjCpf: string;
  telefone: string;
  contato: string;
  email: string;
  endereco: string;
  observacao: string;
  responsavelId?: string | null;
  responsavelNome?: string;
  dataCadastro?: string;
}