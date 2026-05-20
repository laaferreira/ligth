export interface Cliente {
  id?: number;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  dataCadastro?: string;
}
