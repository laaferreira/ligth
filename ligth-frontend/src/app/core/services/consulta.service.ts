import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AutocompleteItem, ProdutoAutocompleteItem, HistoricoPedido } from '../models/consulta.model';

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  buscarClientes(termo: string): Observable<AutocompleteItem[]> {
    const params = new HttpParams().set('termo', termo);
    return this.http.get<AutocompleteItem[]>(`${this.apiUrl}/autocomplete/clientes`, { params });
  }

  buscarProdutos(termo: string): Observable<AutocompleteItem[]> {
    const params = new HttpParams().set('termo', termo);
    return this.http.get<AutocompleteItem[]>(`${this.apiUrl}/autocomplete/produtos`, { params });
  }

  buscarProdutosComPreco(termo: string): Observable<ProdutoAutocompleteItem[]> {
    const params = new HttpParams().set('termo', termo);
    return this.http.get<ProdutoAutocompleteItem[]>(`${this.apiUrl}/autocomplete/produtos-preco`, { params });
  }

  buscarHistorico(clienteId: number, produtoIds: number[]): Observable<HistoricoPedido[]> {
    let params = new HttpParams().set('clienteId', clienteId.toString());
    produtoIds.forEach(id => {
      params = params.append('produtoIds', id.toString());
    });
    return this.http.get<HistoricoPedido[]>(`${this.apiUrl}/consulta/historico`, { params });
  }
}
