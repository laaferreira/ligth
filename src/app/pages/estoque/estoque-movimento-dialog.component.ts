import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EstoqueService } from '../../core/services/estoque.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { AutocompleteItem } from '../../core/models/consulta.model';

@Component({
  selector: 'app-estoque-movimento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-title-row" mat-dialog-title>
      <div>
        <h2 class="dialog-title">Movimentação de Estoque</h2>
        <p class="dialog-subtitle">Registre entradas e saídas em um popup otimizado para celular.</p>
      </div>
      <button mat-icon-button type="button" (click)="fechar()" [disabled]="salvando" aria-label="Fechar popup">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="movForm" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Produto</mat-label>
          <input matInput [formControl]="produtoControl" [matAutocomplete]="autoProd" placeholder="Buscar produto...">
          <mat-autocomplete #autoProd="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onProdutoSelected($event.option.value)">
            @for (p of produtosFiltrados; track p.id) {
              <mat-option [value]="p">{{p.label}}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <div class="form-row two-columns">
          <mat-form-field appearance="outline">
            <mat-label>Qtd</mat-label>
            <input matInput type="number" inputmode="numeric" [formControl]="qtdMovControl" min="1">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Preço Compra</mat-label>
            <input matInput type="number" inputmode="decimal" [formControl]="precoCompraControl" step="0.01" placeholder="R$">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observação</mat-label>
          <input matInput [formControl]="obsControl">
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button type="button" (click)="fechar()" [disabled]="salvando">Cancelar</button>
      <button mat-raised-button color="primary" type="button" (click)="registrar('entrada')" [disabled]="!produtoSelecionado || movForm.invalid || salvando">
        {{ salvando && tipoAcao === 'entrada' ? 'Registrando...' : 'Registrar entrada' }}
      </button>
      <button mat-raised-button color="warn" type="button" (click)="registrar('saida')" [disabled]="!produtoSelecionado || movForm.invalid || salvando">
        {{ salvando && tipoAcao === 'saida' ? 'Registrando...' : 'Registrar saída' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .dialog-title { margin: 0; font-size: 1.3rem; line-height: 1.2; }
    .dialog-subtitle { margin: 6px 0 0; color: #666; font-size: 0.9rem; }
    .dialog-content { max-height: min(72vh, 720px); -webkit-overflow-scrolling: touch; }
    .dialog-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; width: min(100%, 760px); }
    .form-row { display: grid; gap: 0 16px; }
    .two-columns { grid-template-columns: 1fr 1fr; }
    .full-width, mat-form-field { width: 100%; }
    .dialog-actions { display: flex; gap: 12px; padding-top: 12px; border-top: 1px solid #ece3f4; position: sticky; bottom: 0; background: #fff; }
    .dialog-actions .mdc-button { min-height: 44px; }
    @media (max-width: 768px) {
      .dialog-title-row { position: sticky; top: 0; background: #fff; z-index: 2; padding-bottom: 8px; border-bottom: 1px solid #ece3f4; }
      .dialog-content { max-height: calc(100dvh - 180px); }
      .two-columns { grid-template-columns: 1fr; }
      .dialog-actions { flex-direction: column; }
      .dialog-actions button { width: 100%; }
    }
  `]
})
export class EstoqueMovimentoDialogComponent implements OnInit {
  produtosFiltrados: AutocompleteItem[] = [];
  produtoSelecionado: AutocompleteItem | null = null;
  produtoControl = new FormControl('');
  movForm: FormGroup;
  salvando = false;
  tipoAcao: 'entrada' | 'saida' | null = null;

  get qtdMovControl(): FormControl { return this.movForm.get('quantidade') as FormControl; }
  get precoCompraControl(): FormControl { return this.movForm.get('precoCompra') as FormControl; }
  get obsControl(): FormControl { return this.movForm.get('observacao') as FormControl; }

  constructor(
    private estoqueService: EstoqueService,
    private consultaService: ConsultaService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EstoqueMovimentoDialogComponent>
  ) {
    this.movForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      precoCompra: [null],
      observacao: ['']
    });
  }

  ngOnInit(): void {
    this.produtoControl.valueChanges.pipe(
      debounceTime(300),
      filter(v => typeof v === 'string' && v.length >= 2),
      switchMap(v => this.consultaService.buscarProdutos(v as string))
    ).subscribe(p => this.produtosFiltrados = p);
  }

  displayFn(item: AutocompleteItem): string { return item?.label || ''; }

  onProdutoSelected(item: AutocompleteItem): void {
    this.produtoSelecionado = item;
  }

  registrar(tipo: 'entrada' | 'saida'): void {
    if (!this.produtoSelecionado || this.movForm.invalid) return;

    this.salvando = true;
    this.tipoAcao = tipo;
    const { quantidade, precoCompra, observacao } = this.movForm.value;
    const obs$ = tipo === 'entrada'
      ? this.estoqueService.entrada(this.produtoSelecionado.id, quantidade, precoCompra, observacao)
      : this.estoqueService.saida(this.produtoSelecionado.id, quantidade, observacao);

    obs$.subscribe({
      next: () => {
        this.salvando = false;
        this.snackBar.open(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.salvando = false;
        this.snackBar.open(e.error || 'Erro', 'OK', { duration: 4000 });
      }
    });
  }

  fechar(): void {
    this.dialogRef.close();
  }
}