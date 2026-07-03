import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import jsPDF from 'jspdf';

import { AppUser } from '../../core/models/user.model';
import { CriarValeVendedor, ValeVendedor } from '../../core/models/vale-vendedor.model';
import { ErrorPresenterService } from '../../core/errors/error-presenter.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { ValeVendedorService } from '../../core/services/vale-vendedor.service';

const VALES_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Injectable()
class ValesDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const valor = value.trim();
      if (!valor) {
        return null;
      }

      const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, dia, mes, ano] = match;
        const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return this.isValid(data) ? data : null;
      }
    }

    const data = value instanceof Date ? value : new Date(value as string);
    return this.isValid(data) ? data : null;
  }

  override format(date: Date): string {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
}

@Component({
  selector: 'app-vales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: ValesDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VALES_DATE_FORMATS }
  ],
  templateUrl: './vales.component.html',
  styleUrl: './vales.component.scss'
})
export class ValesComponent implements OnInit {
  readonly displayedColumns = ['dataVale', 'vendedor', 'valor', 'observacao', 'acoes'];
  readonly form = this.fb.group({
    vendedorId: ['', Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    observacao: [''],
    dataVale: [new Date(), Validators.required]
  });

  private readonly brandLogoPath = 'assets/light-brand.png';
  private brandLogoDataUrlPromise: Promise<string> | null = null;

  vendedores: AppUser[] = [];
  vales: ValeVendedor[] = [];
  carregando = false;
  salvando = false;

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private valeService: ValeVendedorService,
    private errorPresenter: ErrorPresenterService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarVendedores();
    this.carregarValesRecentes();
  }

  carregarVendedores(): void {
    this.userManagementService.listarUsuarios({ role: 'vendedor', is_active: true }).subscribe({
      next: usuarios => {
        this.vendedores = usuarios;
      },
      error: error => {
        this.errorPresenter.handle(error, {
          context: 'Vales.CarregarVendedores',
          source: 'supabase',
          code: 'VALES_USERS_LOAD_FAILED',
          title: 'Falha ao carregar vendedores',
          fallbackMessage: 'Não foi possível carregar os vendedores.',
          duration: 5000
        });
      }
    });
  }

  carregarValesRecentes(): void {
    this.carregando = true;
    this.valeService.listarRecentes(100).subscribe({
      next: vales => {
        this.vales = vales;
        this.carregando = false;
      },
      error: error => {
        this.carregando = false;
        this.errorPresenter.handle(error, {
          context: 'Vales.CarregarRecentes',
          source: 'supabase',
          code: 'VALES_RECENT_LOAD_FAILED',
          title: 'Falha ao carregar vales',
          fallbackMessage: 'Não foi possível carregar os vales lançados.',
          duration: 5000
        });
      }
    });
  }

  salvarEGerarPdf(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.salvando = true;
    this.valeService.criar(payload).subscribe({
      next: vale => {
        this.vales = [vale, ...this.vales];
        this.salvando = false;
        this.snackBar.open('Vale lançado com sucesso.', 'OK', { duration: 3500 });
        this.imprimirValePdf(vale);
        this.form.patchValue({
          valor: null,
          observacao: '',
          dataVale: new Date()
        });
        this.form.get('valor')?.markAsPristine();
        this.form.get('observacao')?.markAsPristine();
      },
      error: error => {
        this.salvando = false;
        this.errorPresenter.handle(error, {
          context: 'Vales.Salvar',
          source: 'supabase',
          code: 'VALES_CREATE_FAILED',
          title: 'Falha ao lançar vale',
          fallbackMessage: 'Não foi possível lançar o vale.',
          duration: 5000
        });
      }
    });
  }

  gerarPdfVale(vale: ValeVendedor): void {
    this.imprimirValePdf(vale);
  }

  private buildPayload(): CriarValeVendedor | null {
    const { vendedorId, valor, observacao, dataVale } = this.form.getRawValue();

    if (!vendedorId || !valor || !dataVale) {
      return null;
    }

    return {
      vendedorId,
      valor: Number(valor),
      observacao: observacao?.trim() || null,
      dataVale: this.formatarDataParaFiltro(dataVale)
    };
  }

  private async imprimirValePdf(vale: ValeVendedor): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();

    try {
      const brandIcon = await this.getBrandLogoDataUrl();
      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          doc.addImage(brandIcon, 'PNG', 10, 4, 14, 14);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = brandIcon;
      });
    } catch {
      // Logo opcional
    }

    doc.setTextColor(27, 43, 84);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Mega Luz Comercial', pw / 2, 13, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(10, 22, pw - 10, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Termo de Ciência de Vale', 14, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Vendedor: ${vale.vendedorNome}`, 14, 46);
    doc.text(`Data do vale: ${this.formatarData(vale.dataVale)}`, 14, 53);
    doc.text(`Valor do vale: ${this.formatarMoeda(vale.valor)}`, 14, 60);

    doc.setFontSize(11);
    doc.text('Observação:', 14, 72);

    const observacaoTexto = vale.observacao?.trim() || 'Sem observações.';
    const observacaoLinhas = doc.splitTextToSize(observacaoTexto, 180);
    doc.text(observacaoLinhas, 14, 79);

    const assinaturaY = Math.max(150, 85 + observacaoLinhas.length * 6);

    doc.setFont('helvetica', 'normal');
    doc.text('Declaro ciência do lançamento do vale acima informado.', 14, assinaturaY);

    doc.line(14, assinaturaY + 22, 98, assinaturaY + 22);
    doc.text('Assinatura do Vendedor', 14, assinaturaY + 28);

    doc.line(112, assinaturaY + 22, 196, assinaturaY + 22);
    doc.text('Responsável pelo Lançamento', 112, assinaturaY + 28);

    const nomeArquivo = `vale-${vale.vendedorNome.replace(/\s+/g, '-').toLowerCase()}-${vale.dataVale}.pdf`;
    doc.save(nomeArquivo);
  }

  private getBrandLogoDataUrl(): Promise<string> {
    if (!this.brandLogoDataUrlPromise) {
      this.brandLogoDataUrlPromise = fetch(this.brandLogoPath)
        .then(r => {
          if (!r.ok) {
            throw new Error('logo');
          }
          return r.blob();
        })
        .then(blob => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('logo read error'));
          reader.readAsDataURL(blob);
        }));
    }

    return this.brandLogoDataUrlPromise;
  }

  private formatarData(data: string | Date | null | undefined): string {
    if (!data) {
      return '-';
    }

    if (data instanceof Date) {
      return data.toLocaleDateString('pt-BR');
    }

    const [ano, mes, dia] = data.slice(0, 10).split('-');
    if (!ano || !mes || !dia) {
      return data;
    }

    return `${dia}/${mes}/${ano}`;
  }

  private formatarMoeda(valor: number): string {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  private formatarDataParaFiltro(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
