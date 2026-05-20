import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteService } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';
import { Cliente } from '../../core/models/cliente.model';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatToolbarModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatMenuModule, MatSnackBarModule
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  displayedColumns = ['nome', 'cpfCnpj', 'telefone', 'email', 'dataCadastro', 'acoes'];
  form: FormGroup;
  editandoId: number | null = null;
  mostrarForm = false;

  constructor(
    private clienteService: ClienteService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(200)]],
      cpfCnpj: ['', Validators.maxLength(20)],
      telefone: ['', Validators.maxLength(20)],
      email: ['', Validators.maxLength(200)],
      endereco: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void { this.carregar(); }
  carregar(): void { this.clienteService.listar().subscribe(d => this.clientes = d); }

  novo(): void { this.editandoId = null; this.form.reset(); this.mostrarForm = true; }

  editar(c: Cliente): void {
    this.editandoId = c.id!;
    this.form.patchValue(c);
    this.mostrarForm = true;
  }

  salvar(): void {
    if (this.form.invalid) return;
    const dados = this.form.value as Cliente;
    const obs = this.editandoId
      ? this.clienteService.atualizar(this.editandoId, dados)
      : this.clienteService.criar(dados);
    obs.subscribe({
      next: () => { this.snackBar.open(this.editandoId ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000 }); this.cancelar(); this.carregar(); },
      error: () => this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 })
    });
  }

  excluir(c: Cliente): void {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    this.clienteService.excluir(c.id!).subscribe({
      next: () => { this.snackBar.open('Excluido!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 4000 })
    });
  }

  cancelar(): void { this.mostrarForm = false; this.editandoId = null; this.form.reset(); }
  navegarConsulta(): void { this.router.navigate(['/consulta']); }
  navegarProdutos(): void { this.router.navigate(['/produtos']); }
  navegarPedidos(): void { this.router.navigate(['/pedidos']); }
  navegarEstoque(): void { this.router.navigate(['/estoque']); }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
