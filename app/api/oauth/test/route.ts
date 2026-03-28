import { NextRequest, NextResponse } from 'next/server'

/**
 * Test API endpoint for CRM External Auth verification
 * CRM calls this to verify the OAuth connection works.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    app: '0nCore',
    version: '1.0.0',
    message: 'Authentication successful',
  })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    app: '0nCore',
    version: '1.0.0',
  })
}
