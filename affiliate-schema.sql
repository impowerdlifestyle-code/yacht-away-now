-- Affiliate Program Schema for Yacht Away Now
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

-- Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  code TEXT UNIQUE NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
  commission_value NUMERIC(10,2) NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Click tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversions (bookings attributed to affiliates)
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  booking_id TEXT,
  booking_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout history
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT DEFAULT 'other',
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);

-- Enable RLS (Row Level Security) - allow anon key for API access
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations via anon key (admin auth is handled at the API layer)
CREATE POLICY "Allow all on affiliates" ON affiliates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on affiliate_clicks" ON affiliate_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on affiliate_conversions" ON affiliate_conversions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on affiliate_payouts" ON affiliate_payouts FOR ALL USING (true) WITH CHECK (true);

-- Auto-update click counts via trigger
CREATE OR REPLACE FUNCTION update_affiliate_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = NEW.affiliate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_affiliate_click
  AFTER INSERT ON affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_click_count();
