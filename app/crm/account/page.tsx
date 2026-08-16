import AccountProfile from '../AccountProfile'

export const metadata = { title: 'Your 0n account', robots: { index: false, follow: false } }

/**
 * /crm/account — the universal profile.
 *
 * Reachable from every surface because the account is created on every entry
 * path: website signup, Google, a marketplace install, or the SSO handshake
 * inside a CRM iframe. One identity, one page, whichever door was used.
 */
export default function Page() { return <AccountProfile /> }
