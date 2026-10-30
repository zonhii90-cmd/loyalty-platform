-- ============================================================
-- Loyalty Platform — v2 Migration
-- Run ONCE against the Neon database after v1 schema
-- ============================================================

-- ── 1. Extend existing tables ────────────────────────────────

-- companies: branding + slug
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug         varchar(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url     text,
  ADD COLUMN IF NOT EXISTS primary_color varchar(7) DEFAULT '#7c3aed';

-- members: future-proof extra fields
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email varchar(150);

-- memberships: track last activity for points expiry
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- points_ledger: expand allowed sources, add staff reference
ALTER TABLE points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('manual','feedback','purchase','birthday','adjustment','referral','qr_scan','stamp_redeem'));
ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS staff_id uuid;

-- ── 2. Staff ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        varchar(100) NOT NULL,
  pin         varchar(255) NOT NULL,          -- store hashed
  role        varchar(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('manager','cashier')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_company ON staff(company_id);

-- ── 3. Stamp cards ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stamp_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  goal        int NOT NULL DEFAULT 10,         -- stamps needed
  reward_text varchar(255) NOT NULL,           -- e.g. "Free Large Coffee"
  earn_mode   varchar(10) NOT NULL DEFAULT 'qr' CHECK (earn_mode IN ('qr','manual')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_company ON stamp_cards(company_id);

-- tracks each member's progress on the current stamp card
CREATE TABLE IF NOT EXISTS member_stamps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id   uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  stamp_card_id   uuid NOT NULL REFERENCES stamp_cards(id) ON DELETE CASCADE,
  count           int NOT NULL DEFAULT 0,
  completed_count int NOT NULL DEFAULT 0,      -- times card fully completed
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(membership_id, stamp_card_id)
);
CREATE INDEX IF NOT EXISTS idx_member_stamps_membership ON member_stamps(membership_id);

-- ── 4. Rewards catalogue ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS rewards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         varchar(150) NOT NULL,
  description  text,
  points_cost  int NOT NULL,
  validity_days int NOT NULL DEFAULT 30,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rewards_company ON rewards(company_id);

-- ── 5. Vouchers ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vouchers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id   uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  reward_id       uuid REFERENCES rewards(id) ON DELETE SET NULL,
  stamp_card_id   uuid REFERENCES stamp_cards(id) ON DELETE SET NULL,
  code            varchar(12) UNIQUE NOT NULL,
  type            varchar(10) NOT NULL CHECK (type IN ('reward','stamp')),
  description     varchar(255),               -- snapshot of reward name / stamp reward text
  expires_at      timestamptz NOT NULL,
  redeemed_at     timestamptz,
  redeemed_by     uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_code       ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_membership ON vouchers(membership_id);

-- ── 6. QR tokens (one-time earn tokens) ──────────────────────

CREATE TABLE IF NOT EXISTS qr_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  staff_id        uuid REFERENCES staff(id) ON DELETE SET NULL,
  earn_type       varchar(10) NOT NULL CHECK (earn_type IN ('fixed','purchase')),
  points          int NOT NULL,                -- pre-calculated points to award
  amount          numeric(10,2),               -- purchase amount (for purchase mode)
  expires_at      timestamptz NOT NULL,        -- short TTL, e.g. 5 minutes
  used_at         timestamptz,
  used_by         uuid REFERENCES memberships(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_company ON qr_tokens(company_id);

-- ── 7. Seed: backfill slugs for existing companies ───────────

UPDATE companies SET slug = id WHERE slug IS NULL;

