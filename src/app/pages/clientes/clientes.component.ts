import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';
import { Cliente } from '../../core/models/cliente.model';
import { AppUser } from '../../core/models/user.model';
import { UserManagementService } from '../../core/services/user-management.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule, MatSnackBarModule, MatSelectModule
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  displayedColumns = ['nome', 'cpfCnpj', 'contato', 'telefone', 'cidade', 'responsavel', 'dataCadastro', 'acoes'];
  form: FormGroup;
  editandoId: number | null = null;
  mostrarForm = false;
  importando = false;
  resumoImportacao = '';
  responsaveis: AppUser[] = [];
  responsavelPadraoId: string | null = null;

  constructor(
    private clienteService: ClienteService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(200)]],
      cpfCnpj: ['', Validators.maxLength(20)],
      telefone: ['', Validators.maxLength(20)],
      contato: ['', Validators.maxLength(200)],
      email: ['', Validators.maxLength(200)],
      endereco: ['', Validators.maxLength(500)],
      logradouro: ['', Validators.maxLength(255)],
      numero: ['', Validators.maxLength(50)],
      complemento: ['', Validators.maxLength(255)],
      bairro: ['', Validators.maxLength(255)],
      cidade: ['', Validators.maxLength(255)],
      uf: ['', Validators.maxLength(2)],
      cep: ['', Validators.maxLength(20)],
      observacao: ['', Validators.maxLength(1000)],
      responsavelId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregar();
    this.carregarResponsaveis();
  }
  carregar(): void { this.clienteService.listar().subscribe(d => this.clientes = d); }

  novo(): void {
    this.editandoId = null;
    this.form.reset({ responsavelId: this.responsavelPadraoId });
    this.mostrarForm = true;
  }

  editar(c: Cliente): void {
    this.editandoId = c.id!;
    this.form.patchValue(c);
    this.mostrarForm = true;
  }

  salvar(): void {
    if (this.form.invalid) return;
    const dados = this.form.value as Cliente;
    if (!dados.endereco?.trim()) {
      dados.endereco = this.montarEndereco(
        dados.logradouro,
        dados.numero,
        dados.complemento,
        dados.bairro,
        dados.cidade,
        dados.uf,
        dados.cep
      );
    }
    const obs = this.editandoId
      ? this.clienteService.atualizar(this.editandoId, dados)
      : this.clienteService.criar(dados);
    obs.subscribe({
      next: () => { this.snackBar.open(this.editandoId ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000 }); this.cancelar(); this.carregar(); },
      error: () => this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 })
    });
  }

  async importarArquivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    if (!this.responsavelPadraoId) {
      this.snackBar.open('Selecione um responsável padrão antes de importar os clientes.', 'OK', { duration: 4000 });
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

      const clientesImportados = rows
        .map(row => this.mapearLinhaImportacao(row))
        .filter((cliente): cliente is Cliente => !!cliente);

      if (!clientesImportados.length) {
        throw new Error('Nenhum cliente válido foi encontrado na planilha. Verifique se existe uma coluna com nome do cliente.');
      }

      const inseridos = await firstValueFrom(this.clienteService.importar(clientesImportados));
      const totalInserido = inseridos?.length || clientesImportados.length;
      const ignorados = rows.length - clientesImportados.length;

      this.resumoImportacao = `${totalInserido} cliente(s) importado(s)${ignorados > 0 ? `, ${ignorados} linha(s) ignorada(s)` : ''}.`;
      this.snackBar.open(this.resumoImportacao, 'OK', { duration: 5000 });
      this.carregar();
    } catch (error: any) {
      this.snackBar.open(error?.message || 'Erro ao importar arquivo XLSX', 'OK', { duration: 5000 });
    } finally {
      this.importando = false;
      input.value = '';
    }
  }

  excluir(c: Cliente): void {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    this.clienteService.excluir(c.id!).subscribe({
      next: () => { this.snackBar.open('Excluido!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 4000 })
    });
  }

  cancelar(): void { this.mostrarForm = false; this.editandoId = null; this.form.reset({ responsavelId: this.responsavelPadraoId }); }
  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

  nomeResponsavel(cliente: Cliente): string {
    const responsavel = this.responsaveis.find(user => user.id === cliente.responsavelId);
    if (!responsavel) {
      return '-';
    }

    return responsavel.is_active ? responsavel.nome : `${responsavel.nome} (inativo)`;
  }

  private mapearLinhaImportacao(row: Record<string, unknown>): Cliente | null {
    const nome = this.obterValor(row, ['nome']);
    if (!nome) {
      return null;
    }

    const logradouro = this.obterValor(row, ['logradouro']);
    const numero = this.obterValor(row, ['número', 'numero']);
    const complemento = this.obterValor(row, ['complemento']);
    const bairro = this.obterValor(row, ['bairro']);
    const cidade = this.obterValor(row, ['cidade']);
    const uf = this.obterValor(row, ['uf']);
    const cep = this.obterValor(row, ['cep']);
    const endereco = this.obterValor(row, ['endereço', 'endereco']) || this.montarEndereco(logradouro, numero, complemento, bairro, cidade, uf, cep);

    return {
      nome,
      cpfCnpj: this.obterValor(row, ['cpf/cnpj', 'cpfcnpj']),
      telefone: this.obterValor(row, ['telefone']),
      contato: this.obterValor(row, ['contato']),
      email: this.obterValor(row, ['e-mail', 'email']),
      endereco,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      observacao: this.obterValor(row, ['observação', 'observacao']),
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

  private montarEndereco(...partes: Array<string | undefined>): string {
    return partes.filter((parte): parte is string => !!parte && !!parte.trim()).join(', ');
  }

  private normalizarCabecalho(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private carregarResponsaveis(): void {
    this.userManagementService.listarUsuarios().subscribe({
      next: usuarios => {
        this.responsaveis = usuarios;
        this.userManagementService.obterUsuarioAtualComRole().then(usuarioAtual => {
          this.responsavelPadraoId = usuarioAtual?.id || usuarios[0]?.id || null;
          if (!this.form.get('responsavelId')?.value) {
            this.form.patchValue({ responsavelId: this.responsavelPadraoId });
          }
        });
      },
      error: () => {
        this.snackBar.open('Não foi possível carregar os responsáveis.', 'OK', { duration: 4000 });
      }
    });
  }
}
