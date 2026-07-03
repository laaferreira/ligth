export interface ValeVendedor {
  id: number;
  vendedorId: string;
  vendedorNome: string;
  valor: number;
  observacao: string | null;
  dataVale: string;
  createdAt?: string;
  userId?: string | null;
}

export interface CriarValeVendedor {
  vendedorId: string;
  valor: number;
  observacao?: string | null;
  dataVale: string;
}
