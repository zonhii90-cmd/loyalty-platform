-- ============================================================
-- Loyalty Platform — Neon Schema
-- ============================================================

-- 1. Companies (multi-tenant)
CREATE TABLE IF NOT EXISTS companies (
  id           text PRIMARY KEY,
  name         varchar(100) NOT NULL,
  password     varchar(100) NOT NULL,
  email        varchar(100),
  created_at   timestamptz DEFAULT now()
);

-- 2. Members (cross-company identity)
CREATE TABLE IF NOT EXISTS members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        varchar(20) UNIQUE NOT NULL,
  name         varchar(100),
  birthday     date,
  created_at   timestamptz DEFAULT now()
);

-- 3. Memberships (member ↔ company + per-company points)
CREATE TABLE IF NOT EXISTS memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  company_id   text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  points       int NOT NULL DEFAULT 0,
  tier         varchar(20) DEFAULT 'bronze',
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(member_id, company_id)
);

-- 4. Points Ledger (immutable — INSERT only)
CREATE TABLE IF NOT EXISTS points_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  type          varchar(10) NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  amount        int NOT NULL,
  source        varchar(20) NOT NULL CHECK (source IN ('manual', 'feedback', 'purchase', 'birthday', 'adjustment', 'referral')),
  note          varchar(255),
  created_by    varchar(100),
  created_at    timestamptz DEFAULT now()
);

-- 5. Settings (per-company config)
CREATE TABLE IF NOT EXISTS settings (
  id           text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  company_id   text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data         jsonb NOT NULL DEFAULT '{}',
  updated_at   timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_phone           ON members(phone);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id   ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company_id  ON memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_membership_id    ON points_ledger(membership_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at       ON points_ledger(created_at DESC);

-- Seed super admin (change password after first deploy!)
INSERT INTO companies (id, name, password) VALUES ('super', 'Super Admin', 'changeme-super')
  ON CONFLICT (id) DO NOTHING;
