import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const text = await req.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })

  // Detect header row: first row with non-numeric first column
  const firstCols = lines[0].split(',')
  const hasHeader = isNaN(Number(firstCols[0].replace(/[^0-9]/g, ''))) && firstCols[0].length > 5
  const rows = hasHeader ? lines.slice(1) : lines

  const db = sql()
  let imported = 0
  let skipped  = 0
  const errors: string[] = []

  for (const line of rows) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const phone = cols[0]?.replace(/\s+/g, '')
    const name  = cols[1] || null
    const pts   = parseInt(cols[2] ?? '0', 10) || 0

    if (!phone || phone.length < 7) { skipped++; continue }

    try {
      // Upsert member
      const memberRow = await db`
        INSERT INTO members (phone, name) VALUES (${phone}, ${name})
        ON CONFLICT (phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, members.name)
        RETURNING id
      `
      const memberId = memberRow[0].id

      // Upsert membership
      const msRow = await db`
        INSERT INTO memberships (member_id, company_id, points)
        VALUES (${memberId}, ${auth.companyId}, ${pts})
        ON CONFLICT (member_id, company_id) DO NOTHING
        RETURNING id, points
      `

      if (msRow[0] && pts > 0) {
        // Add ledger entry for initial points
        await db`
          INSERT INTO points_ledger (membership_id, type, amount, source, note)
          VALUES (${msRow[0].id}, 'earn', ${pts}, 'adjustment', 'Bulk import')
        `
      }

      imported++
    } catch {
      errors.push(phone)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
