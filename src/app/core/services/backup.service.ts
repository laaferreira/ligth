import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import JSZip from 'jszip';

interface TableConfig {
  name: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class BackupService {

  private readonly TABLES: TableConfig[] = [
    { name: 'clientes',               label: 'clientes' },
    { name: 'fornecedores',           label: 'fornecedores' },
    { name: 'produtos',               label: 'produtos' },
    { name: 'pedidos',                label: 'pedidos' },
    { name: 'itens_pedidos',          label: 'itens_pedidos' },
    { name: 'movimentacoes_estoque',  label: 'movimentacoes_estoque' },
    { name: 'app_users',              label: 'app_users' },
  ];

  // Colunas sensíveis removidas do backup de usuários
  private readonly EXCLUDED_COLUMNS: Record<string, string[]> = {
    app_users: ['password', 'encrypted_password', 'hashed_password'],
  };

  constructor(private supabaseService: SupabaseService) {}

  async gerarBackupZip(
    onProgress?: (tabela: string, atual: number, total: number) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const dataStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const pasta = zip.folder(`backup_${dataStr}`)!;

    // README para reimportação
    pasta.file('README.txt', this.gerarReadme(dataStr));

    const total = this.TABLES.length;

    for (let i = 0; i < total; i++) {
      const { name, label } = this.TABLES[i];
      onProgress?.(label, i + 1, total);

      try {
        const rows = await this.buscarTabela(name);
        const csv = rows.length > 0 ? this.toCsv(rows, this.EXCLUDED_COLUMNS[name]) : '';
        pasta.file(`${label}.csv`, csv);
      } catch {
        // Tabela pode não existir neste ambiente — grava CSV vazio com comentário
        pasta.file(`${label}.csv`, `# Tabela ${label} nao disponivel ou sem permissao\n`);
      }
    }

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  private async buscarTabela(tabela: string): Promise<Record<string, unknown>[]> {
    const PAGE_SIZE = 1000;
    const resultado: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await this.supabaseService.getClient()
        .from(tabela)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      resultado.push(...(data as Record<string, unknown>[]));

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return resultado;
  }

  private toCsv(rows: Record<string, unknown>[], excludeCols?: string[]): string {
    if (rows.length === 0) return '';

    const allKeys = Object.keys(rows[0]);
    const keys = excludeCols ? allKeys.filter(k => !excludeCols.includes(k)) : allKeys;

    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      // Envolve em aspas se contiver vírgula, aspas ou quebra de linha
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = keys.join(',');
    const body = rows.map(row => keys.map(k => escape(row[k])).join(',')).join('\n');
    return `${header}\n${body}\n`;
  }

  private gerarReadme(dataStr: string): string {
    return `BACKUP DO BANCO DE DADOS
========================
Data: ${dataStr.replace('T', ' ').replace(/-/g, (m, i) => i < 10 ? '-' : ':')}
Gerado pelo sistema Ligth

TABELAS INCLUIDAS
-----------------
${this.TABLES.map(t => `- ${t.label}.csv`).join('\n')}

COMO REIMPORTAR
---------------
1. Acesse o Supabase Dashboard > SQL Editor
2. Para cada tabela, use o comando:

   COPY nome_tabela FROM '/caminho/arquivo.csv' DELIMITER ',' CSV HEADER;

   Ou utilize a interface de importacao CSV do Supabase:
   Dashboard > Table Editor > [Tabela] > Import data

3. Respeite a ordem de importacao para integridade referencial:
   1. app_users
   2. clientes
   3. fornecedores
   4. produtos
   5. pedidos
   6. itens_pedidos
   7. movimentacoes_estoque

OBSERVACOES
-----------
- Campos sensiveis de senhas foram omitidos de app_users.
- Os IDs originais sao preservados para manter referencias entre tabelas.
- Certifique-se de desabilitar as restricoes de FK antes de importar, se necessario.
`;
  }

  baixarArquivo(blob: Blob, nomeArquivo: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  }
}
