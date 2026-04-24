import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Cliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly url = `${environment.apiUrl}/clientes`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Cliente[]> { return this.http.get<Cliente[]>(this.url); }
  buscarPorId(id: number): Observable<Cliente> { return this.http.get<Cliente>(`${this.url}/${id}`); }
  criar(c: Cliente): Observable<Cliente> { return this.http.post<Cliente>(this.url, c); }
  atualizar(id: number, c: Cliente): Observable<Cliente> { return this.http.put<Cliente>(`${this.url}/${id}`, c); }
  excluir(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
