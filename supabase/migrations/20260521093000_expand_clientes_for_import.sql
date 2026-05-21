ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS contato TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

UPDATE clientes
SET data_cadastro = COALESCE(data_cadastro, created_at)
WHERE data_cadastro IS NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_responsavel_id ON clientes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
