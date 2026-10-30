import { sql } from '@/lib/db'

export async function recalculateTier(
  membershipId: string,
  companyId: string,
  lifetimePoints: number,
): Promise<string> {
  const db = sql()
  const settingsRows = await db`SELECT data FROM settings WHERE id = ${companyId}`
  const data = settingsRows[0]?.data || {}

  const silverThreshold = parseInt(data.tier_silver ?? '500',  10)
  const goldThreshold   = parseInt(data.tier_gold   ?? '2000', 10)

  const tier =
    lifetimePoints >= goldThreshold   ? 'gold'   :
    lifetimePoints >= silverThreshold ? 'silver'  :
    'bronze'

  await db`UPDATE memberships SET tier = ${tier} WHERE id = ${membershipId}`
  return tier
}

export async function addEarnPoints(
  membershipId: string,
  companyId: string,
  pts: number,
  source: string,
  note: string,
  staffId?: string | null,
  branchId?: string | null,
): Promise<{ newBalance: number; lifetimePoints: number; tier: string }> {
  const db = sql()

  const updated = await db`
    UPDATE memberships
    SET points          = points + ${pts},
        lifetime_points = lifetime_points + ${pts},
        last_activity_at = now()
    WHERE id = ${membershipId}
    RETURNING points, lifetime_points
  `
  const { points: newBalance, lifetime_points: lifetimePoints } = updated[0]

  await db`
    INSERT INTO points_ledger (membership_id, type, amount, source, note, staff_id, branch_id)
    VALUES (${membershipId}, 'earn', ${pts}, ${source}, ${note}, ${staffId ?? null}, ${branchId ?? null})
  `

  const tier = await recalculateTier(membershipId, companyId, lifetimePoints)
  return { newBalance, lifetimePoints, tier }
}
