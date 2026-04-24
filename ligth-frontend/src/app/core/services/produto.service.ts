import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Produto } from '../models/produto.model';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly url = `${environment.apiUrl}/produtos`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Produto[]> { return this.http.get<Produto[]>(this.url); }
  buscarPorId(id: number): Observable<Produto> { return this.http.get<Produto>(`${this.url}/${id}`); }
  criar(p: Produto): Observable<Produto> { return this.http.post<Produto>(this.url, p); }
  atualizar(id: number, p: Produto): Observable<Produto> { return this.http.put<Produto>(`${this.url}/${id}`, p); }
  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
