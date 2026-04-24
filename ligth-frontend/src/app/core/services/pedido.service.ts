import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Pedido, CriarPedido } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly url = `${environment.apiUrl}/pedidos`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Pedido[]> { return this.http.get<Pedido[]>(this.url); }
  buscarPorId(id: number): Observable<Pedido> { return this.http.get<Pedido>(`${this.url}/${id}`); }
  criar(p: CriarPedido): Observable<Pedido> { return this.http.post<Pedido>(this.url, p); }
  atualizar(id: number, p: CriarPedido): Observable<Pedido> { return this.http.put<Pedido>(`${this.url}/${id}`, p); }
  confirmar(id: number): Observable<Pedido> { return this.http.patch<Pedido>(`${this.url}/${id}/confirmar`, {}); }
  cancelar(id: number): Observable<Pedido> { return this.http.patch<Pedido>(`${this.url}/${id}/cancelar`, {}); }
  finalizar(id: number): Observable<Pedido> { return this.http.patch<Pedido>(`${this.url}/${id}/finalizar`, {}); }
  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
