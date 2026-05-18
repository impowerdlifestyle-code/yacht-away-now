-- Run this in Supabase SQL Editor to add password support
-- Affiliates can set a custom password; falls back to referral code if not set

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS portal_password TEXT;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
