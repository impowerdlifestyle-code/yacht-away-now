-- Run this in Supabase SQL Editor
-- Stores signed contract data with signatures for PDF generation

CREATE TABLE IF NOT EXISTS signed_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  charterer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  charter_type TEXT,
  charter_date TEXT,
  guests INTEGER,
  captain TEXT,
  total_price NUMERIC(10,2),
  deposit_amount NUMERIC(10,2),
  signer_name TEXT NOT NULL,
  signature_data TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE signed_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on signed_contracts" ON signed_contracts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contracts_email ON signed_contracts(email);
CREATE INDEX IF NOT EXISTS idx_contracts_date ON signed_contracts(signed_at);
