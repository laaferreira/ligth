import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';
import { Cliente } from '../../core/models/cliente.model';
import { AppUser } from '../../core/models/user.model';
import { UserManagementService } from '../../core/services/user-management.service';
import { ClienteDialogComponent } from './cliente-dialog.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule, MatSnackBarModule, MatSelectModule, MatPaginatorModule, MatTooltipModule
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  displayedColumns = ['nome', 'cpfCnpj', 'contato', 'telefone', 'cidade', 'responsavel', 'dataCadastro', 'acoes'];
  importando = false;
  podeImportarXls = false;
  podeCadastrarCliente = true;
  resumoImportacao = '';
  responsaveis: AppUser[] = [];
  responsavelPadraoId: string | null = null;
  private usuarioAtualId: string | null = null;
  private userRole: string | null = null;
  filtro = '';
  paginaAtual = 0;
  itensPorPagina = 10;
  readonly opcoesItensPorPagina = [10, 25, 50];

  constructor(
    private clienteService: ClienteService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarResponsaveis();
  }
  carregar(): void {
    const responsavelFiltro = this.userRole === 'vendedor' ? this.usuarioAtualId : null;
    this.clienteService.listar(responsavelFiltro).subscribe(d => {
      this.clientes = d;
      this.paginaAtual = 0;
    });
  }

  novo(): void {
    if (!this.podeCadastrarCliente) {
      this.snackBar.open('Você não tem permissão para cadastrar novos clientes.', 'OK', { duration: 4000 });
      return;
    }

    this.abrirDialogoCliente('criar');
  }

  editar(c: Cliente): void {
    this.abrirDialogoCliente('editar', c);
  }

  async importarArquivo(event: Event): Promise<void> {
    if (!this.podeImportarXls) {
      this.snackBar.open('Somente administradores podem importar clientes por XLSX.', 'OK', { duration: 4000 });
      return;
    }

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

  trackResponsavel(responsavel: AppUser): string {
    return responsavel.id;
  }

  trackCliente(cliente: Cliente): string {
    return cliente.id != null
      ? String(cliente.id)
      : `${cliente.nome}-${cliente.cpfCnpj || cliente.dataCadastro || 'sem-id'}`;
  }

  get clientesFiltrados(): Cliente[] {
    const termo = this.filtro.trim().toLowerCase();
    if (!termo) return this.clientes;
    return this.clientes.filter(c =>
      (c.nome?.toLowerCase().includes(termo)) ||
      (c.cpfCnpj?.toLowerCase().includes(termo)) ||
      (c.cidade?.toLowerCase().includes(termo)) ||
      (c.contato?.toLowerCase().includes(termo)) ||
      (c.telefone?.toLowerCase().includes(termo))
    );
  }

  get clientesPaginados(): Cliente[] {
    const inicio = this.paginaAtual * this.itensPorPagina;
    return this.clientesFiltrados.slice(inicio, inicio + this.itensPorPagina);
  }

  aoFiltrar(): void {
    this.paginaAtual = 0;
  }

  aoMudarPagina(event: PageEvent): void {
    this.paginaAtual = event.pageIndex;
    this.itensPorPagina = event.pageSize;
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
      inadimplente: this.obterBooleano(row, ['inadimplente', 'cliente inadimplente']),
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

  private obterBooleano(row: Record<string, unknown>, aliases: string[]): boolean {
    const valor = this.obterValor(row, aliases).toLowerCase();
    return ['1', 'sim', 's', 'true', 'x', 'yes', 'y'].includes(valor);
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

  private abrirDialogoCliente(modo: 'criar' | 'editar', cliente?: Cliente): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    this.dialog.open(ClienteDialogComponent, {
      width: isMobile ? '100vw' : '960px',
      height: isMobile ? '100dvh' : undefined,
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100dvh' : '92vh',
      disableClose: true,
      autoFocus: false,
      data: {
        modo,
        cliente,
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
          this.usuarioAtualId = usuarioAtual?.id || null;
          this.userRole = usuarioAtual?.role || null;
          this.podeCadastrarCliente = usuarioAtual?.podeCadastrarCliente !== false;
          this.responsavelPadraoId = usuarioAtual?.id || usuarios[0]?.id || null;
          this.carregar();
        });
      },
      error: () => {
        this.snackBar.open('Não foi possível carregar os responsáveis.', 'OK', { duration: 4000 });
      }
    });
  }

  imprimirEtiqueta(cliente: Cliente): void {
    const gerar = async () => {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('l', 'mm', 'a4');

      const pw = doc.internal.pageSize.getWidth();   // 297
      const ph = doc.internal.pageSize.getHeight();  // 210

      // Frame da etiqueta
      const lx = 12, ly = 8, lw = pw - 24, lh = ph - 16;

      // ── Cabeçalho ──────────────────────────────────────────────────────────
      const hh = 50;
      doc.setFillColor(255, 255, 255);  // branco
      doc.rect(lx, ly, lw, hh, 'F');

      // Logo da marca (opcional)
      try {
        const logoDataUrl = await this.imageToDataUrl('assets/light-brand.png');
        doc.addImage(logoDataUrl, 'PNG', lx + 8, ly + 7, 36, 36);
      } catch { /* sem logo */ }

      // Texto "MEGA LUZ COMERCIAL"
      doc.setTextColor(15, 45, 25);
      doc.setFontSize(34);
      doc.setFont('helvetica', 'bold');
      doc.text('MEGA LUZ COMERCIAL', pw / 2 + 10, ly + hh / 2 + 6, { align: 'center' });

      // ── Borda azul da etiqueta inteira ──────────────────────────────────────
      doc.setDrawColor(30, 60, 180);
      doc.setLineWidth(1.8);
      doc.rect(lx, ly, lw, lh);

      // Linha azul após cabeçalho
      doc.line(lx, ly + hh, lx + lw, ly + hh);

      // ── Nome do cliente ────────────────────────────────────────────────────
      const nomeSectionH = 52;
      const nomeSectionY = ly + hh;
      const nomeFonte = 30;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(nomeFonte);
      doc.setFont('helvetica', 'bold');
      const nomeTexto = (cliente.nome || '').toUpperCase();
      doc.text(nomeTexto, pw / 2, nomeSectionY + nomeSectionH / 2 + nomeFonte * 0.18, {
        align: 'center',
        maxWidth: lw - 20
      });

      // Linha azul após nome
      doc.setDrawColor(30, 60, 180);
      doc.line(lx, nomeSectionY + nomeSectionH, lx + lw, nomeSectionY + nomeSectionH);

      // ── Endereço ────────────────────────────────────────────────────────────
      const enderecoSectionH = 34;
      const enderecoSectionY = nomeSectionY + nomeSectionH;
      const logradouro = [cliente.logradouro || '', cliente.numero || '']
        .map(s => s.trim()).filter(Boolean).join(', ');
      const enderecoTexto = (logradouro || cliente.endereco || '').toUpperCase();
      doc.setFontSize(20);
      doc.setFont('helvetica', 'normal');
      doc.text(enderecoTexto, pw / 2, enderecoSectionY + enderecoSectionH / 2 + 4, {
        align: 'center',
        maxWidth: lw - 20
      });

      // Linha azul após endereço
      doc.setDrawColor(30, 60, 180);
      doc.line(lx, enderecoSectionY + enderecoSectionH, lx + lw, enderecoSectionY + enderecoSectionH);

      // ── Rodapé com 4 células ────────────────────────────────────────────────
      const rodapeY = enderecoSectionY + enderecoSectionH;
      const rodapeH = lh - (hh + nomeSectionH + enderecoSectionH);
      const cellW = lw / 4;

      const celulas = [
        { label: 'CIDADE',  valor: (cliente.cidade || '').toUpperCase() },
        { label: 'CEP',     valor: cliente.cep || '' },
        { label: 'BAIRRO',  valor: (cliente.bairro || '').toUpperCase() },
        { label: 'VOLUME',  valor: '' }
      ];

      celulas.forEach((cel, idx) => {
        const cx = lx + idx * cellW;

        // Divisória vertical (exceto na primeira)
        if (idx > 0) {
          doc.setDrawColor(30, 60, 180);
          doc.setLineWidth(1.8);
          doc.line(cx, rodapeY, cx, rodapeY + rodapeH);
        }

        // Label
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(cel.label, cx + cellW / 2, rodapeY + rodapeH * 0.38, { align: 'center' });

        // Valor
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(cel.valor, cx + cellW / 2, rodapeY + rodapeH * 0.65, {
          align: 'center',
          maxWidth: cellW - 8
        });
      });

      const nomeSafe = (cliente.nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      doc.save(`etiqueta-${nomeSafe}.pdf`);
    };

    gerar().catch(err => {
      console.error('Erro ao gerar etiqueta:', err);
      this.snackBar.open('Erro ao gerar etiqueta.', 'OK', { duration: 3000 });
    });
  }

  private async imageToDataUrl(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Logo não encontrado.');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao processar logo.'));
      reader.readAsDataURL(blob);
    });
  }
}
