import { NextResponse } from 'next/server'
import { health } from '@/lib/0nmcp-client'

export async function GET() {
  try {
    const result = await health()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server unreachable'
    return NextResponse.json(
      { status: 'offline', message },
      { status: 503 }
    )
  }
}
