import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FornecedorService } from '../../core/services/fornecedor.service';
import { AuthService } from '../../core/services/auth.service';
import { Fornecedor } from '../../core/models/fornecedor.model';
import { AppUser } from '../../core/models/user.model';
import { UserManagementService } from '../../core/services/user-management.service';
import { FornecedorDialogComponent } from './fornecedor-dialog.component';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule, MatSnackBarModule, MatSelectModule
  ],
  templateUrl: './fornecedores.component.html',
  styleUrl: './fornecedores.component.scss'
})
export class FornecedoresComponent implements OnInit {
  fornecedores: Fornecedor[] = [];
  displayedColumns = ['nome', 'razaoSocial', 'cnpjCpf', 'telefone', 'responsavel', 'dataCadastro', 'acoes'];
  importando = false;
  podeImportarXls = false;
  resumoImportacao = '';
  responsaveis: AppUser[] = [];
  responsavelPadraoId: string | null = null;

  constructor(
    private fornecedorService: FornecedorService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarResponsaveis();
  }

  carregar(): void {
    this.fornecedorService.listar().subscribe(d => this.fornecedores = d);
  }

  novo(): void {
    this.abrirDialogoFornecedor('criar');
  }

  editar(fornecedor: Fornecedor): void {
    this.abrirDialogoFornecedor('editar', fornecedor);
  }

  async importarArquivo(event: Event): Promise<void> {
    if (!this.podeImportarXls) {
      this.snackBar.open('Somente administradores podem importar fornecedores por XLSX.', 'OK', { duration: 4000 });
      return;
    }

    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    if (!this.responsavelPadraoId) {
      this.snackBar.open('Selecione um responsável padrão antes de importar os fornecedores.', 'OK', { duration: 4000 });
      input.value = '';
      return;
    }

    this.importando = true;
    this.resumoImportacao = '';

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const primeiraAba = workbook.SheetNames[0];

      if (!primeiraAba) {
        throw new Error('A planilha não contém abas para importação.');
      }

      const sheet = workbook.Sheets[primeiraAba];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false
      });

      if (!rows.length) {
        throw new Error('A planilha está vazia.');
      }

      const fornecedoresImportados = rows
        .map(row => this.mapearLinhaImportacao(row))
        .filter((fornecedor): fornecedor is Fornecedor => !!fornecedor);

      if (!fornecedoresImportados.length) {
        throw new Error('Nenhum fornecedor válido foi encontrado na planilha. Verifique se existe uma coluna com nome, fornecedor ou razão social.');
      }

      const inseridos = await firstValueFrom(this.fornecedorService.importar(fornecedoresImportados));
      const totalInserido = inseridos?.length || fornecedoresImportados.length;
      const ignorados = rows.length - fornecedoresImportados.length;

      this.resumoImportacao = `${totalInserido} fornecedor(es) importado(s)${ignorados > 0 ? `, ${ignorados} linha(s) ignorada(s)` : ''}.`;
      this.snackBar.open(this.resumoImportacao, 'OK', { duration: 5000 });
      this.carregar();
    } catch (error: any) {
      this.snackBar.open(error?.message || 'Erro ao importar arquivo XLSX', 'OK', { duration: 5000 });
    } finally {
      this.importando = false;
      input.value = '';
    }
  }

  nomeResponsavel(fornecedor: Fornecedor): string {
    const responsavel = this.responsaveis.find(user => user.id === fornecedor.responsavelId);
    if (!responsavel) {
      return '-';
    }

    return responsavel.is_active ? responsavel.nome : `${responsavel.nome} (inativo)`;
  }

  trackResponsavel(responsavel: AppUser): string {
    return responsavel.id;
  }

  trackFornecedor(fornecedor: Fornecedor): string {
    return fornecedor.id != null
      ? String(fornecedor.id)
      : `${fornecedor.nome}-${fornecedor.cnpjCpf || fornecedor.email || 'sem-id'}`;
  }

  private mapearLinhaImportacao(row: Record<string, unknown>): Fornecedor | null {
    const nome = this.obterValor(row, ['nome fantasia', 'nome', 'fornecedor', 'fantasia']) || this.obterValor(row, ['razao social', 'razão social']);
    if (!nome) {
      return null;
    }

    return {
      nome,
      razaoSocial: this.obterValor(row, ['razao social', 'razão social', 'razaosocial']),
      cnpjCpf: this.obterValor(row, ['cnpj', 'cpf', 'cnpj/cpf', 'cnpjcpf']),
      telefone: this.obterValor(row, ['telefone', 'fone', 'celular']),
      contato: this.obterValor(row, ['contato', 'responsavel', 'responsável']),
      email: this.obterValor(row, ['e-mail', 'email']),
      endereco: this.obterValor(row, ['endereco', 'endereço']),
      observacao: this.obterValor(row, ['observacao', 'observação', 'obs']),
      responsavelId: this.responsavelPadraoId,
      dataCadastro: undefined
    };
  }

  private obterValor(row: Record<string, unknown>, aliases: string[]): string {
    const entries = Object.entries(row);
    for (const [key, value] of entries) {
      const normalizedKey = this.normalizarCabecalho(key);
      if (aliases.some(alias => this.normalizarCabecalho(alias) === normalizedKey)) {
        return String(value ?? '').trim();
      }
    }
    return '';
  }

  private normalizarCabecalho(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private abrirDialogoFornecedor(modo: 'criar' | 'editar', fornecedor?: Fornecedor): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(FornecedorDialogComponent, {
      width: isMobile ? '100vw' : '960px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      disableClose: true,
      autoFocus: false,
      data: {
        modo,
        fornecedor,
        responsaveis: this.responsaveis,
        responsavelPadraoId: this.responsavelPadraoId
      }
    }).afterClosed().subscribe(recarregar => {
      if (recarregar) {
        this.carregar();
      }
    });
  }

  private carregarResponsaveis(): void {
    this.userManagementService.listarUsuarios().subscribe({
      next: usuarios => {
        this.responsaveis = usuarios;
        this.userManagementService.obterUsuarioAtualComRole().then(usuarioAtual => {
          this.podeImportarXls = usuarioAtual?.role === 'administrador';
          this.responsavelPadraoId = usuarioAtual?.id || usuarios[0]?.id || null;
        });
      },
      error: () => {
        this.snackBar.open('Não foi possível carregar os responsáveis.', 'OK', { duration: 4000 });
      }
    });
  }

  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarClientes(): void { this.router.navigate(['/clientes']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}