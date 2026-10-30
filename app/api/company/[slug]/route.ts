import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const db = sql()
  const rows = await db`
    SELECT id, name, slug, logo_url, primary_color
    FROM companies
    WHERE slug = ${slug} AND active = true
    LIMIT 1
  `
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ company: rows[0] })
}
