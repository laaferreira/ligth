export interface Cliente {
  id?: number;
  nome: string;
  inadimplente?: boolean;
  cpfCnpj: string;
  telefone: string;
  contato: string;
  email: string;
  endereco: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacao: string;
  responsavelId?: string | null;
  responsavelNome?: string;
  dataCadastro?: string;
}
