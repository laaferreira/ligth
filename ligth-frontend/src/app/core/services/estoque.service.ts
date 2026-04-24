import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Produto } from '../models/produto.model';
import { Movimentacao } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private readonly url = `${environment.apiUrl}/estoque`;
  constructor(private http: HttpClient) {}

  entrada(produtoId: number, quantidade: number, observacao: string): Observable<string> {
    return this.http.post(`${this.url}/entrada`, { produtoId, quantidade, observacao }, { responseType: 'text' });
  }

  saida(produtoId: number, quantidade: number, observacao: string): Observable<string> {
    return this.http.post(`${this.url}/saida`, { produtoId, quantidade, observacao }, { responseType: 'text' });
  }

  estoqueBaixo(): Observable<Produto[]> {
    return this.http.get<Produto[]>(`${this.url}/baixo`);
  }

  estoqueProduto(produtoId: number): Observable<{ produtoId: number; estoqueAtual: number; comprometido: number; estoqueFuturo: number }> {
    return this.http.get<any>(`${this.url}/produto/${produtoId}`);
  }

  historico(produtoId?: number): Observable<Movimentacao[]> {
    let params = new HttpParams();
    if (produtoId) params = params.set('produtoId', produtoId.toString());
    return this.http.get<Movimentacao[]>(`${this.url}/historico`, { params });
  }
}
