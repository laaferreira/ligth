ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS inadimplente BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_clientes_inadimplente ON clientes(inadimplente);
