import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Dashboard {
  totalClientes: number;
  totalProdutos: number;
  totalPedidos: number;
  pedidosAbertos: number;
  faturamentoTotal: number;
  produtosEstoqueBaixo: number;
  produtosMaisVendidos: { label: string; valor: number; quantidade: number }[];
  clientesMaisCompraram: { label: string; valor: number; quantidade: number }[];
  faturamentoPorMes: { mes: string; faturamento: number; lucro: number }[];
  estoqueCritico: { codigo: string; descricao: string; estoque: number; minimo: number }[];
  pedidosPorStatus: { status: string; quantidade: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${environment.apiUrl}/dashboard`);
  }
}
