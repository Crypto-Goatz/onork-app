import { runSlashCommand } from '@/lib/slack/handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return runSlashCommand(req, '/0npost')
}
