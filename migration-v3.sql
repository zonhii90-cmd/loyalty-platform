-- ============================================================
-- Loyalty Platform — v3 Migration
-- Run ONCE after v2 migration
-- ============================================================

-- ── Campaigns (double-points / promotions) ───────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        varchar(150) NOT NULL,
  multiplier  numeric(4,2) NOT NULL DEFAULT 2.0,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active  ON campaigns(active, starts_at, ends_at);

-- ── Branches (multi-location) ────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        varchar(100) NOT NULL,
  location    varchar(255),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);

-- ── Add branch_id to staff ────────────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

-- ── Add branch_id to points_ledger ───────────────────────────
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
