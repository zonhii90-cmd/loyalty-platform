import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const [settingsRows, companyRows] = await Promise.all([
    db`SELECT data FROM settings WHERE company_id = ${auth.companyId} LIMIT 1`,
    db`SELECT slug, logo_url, primary_color FROM companies WHERE id = ${auth.companyId} LIMIT 1`,
  ])

  const company = companyRows[0] || {}
  return NextResponse.json({
    settings: settingsRows[0]?.data || {},
    branding: {
      slug:          company.slug          || auth.companyId,
      logo_url:      company.logo_url      || null,
      primary_color: company.primary_color || '#7c3aed',
    },
  })
}

export async function PUT(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { settings, branding } = await req.json()
  const db = sql()

  // Save JSONB settings
  if (settings !== undefined) {
    await db`
      INSERT INTO settings (id, company_id, data, updated_at)
      VALUES (${auth.companyId}, ${auth.companyId}, ${JSON.stringify(settings)}, now())
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(settings)}, updated_at = now()
    `
  }

  // Save branding to companies table
  if (branding) {
    const { slug, logo_url, primary_color } = branding

    if (slug) {
      // Check slug uniqueness (excluding own id)
      const conflict = await db`
        SELECT id FROM companies WHERE slug = ${slug} AND id != ${auth.companyId} LIMIT 1
      `
      if (conflict[0]) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }

    await db`
      UPDATE companies
      SET
        slug          = COALESCE(${slug || null}, slug),
        logo_url      = ${logo_url  ?? null},
        primary_color = COALESCE(${primary_color || null}, primary_color)
      WHERE id = ${auth.companyId}
    `
  }

  return NextResponse.json({ success: true })
}
