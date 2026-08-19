-- scoped_wallets + scoped_wallet_entries — the Client Upsell wallet, at BOTH levels.
--
-- WHY A SECOND WALLET TABLE AND NOT user_wallets. `user_wallets` is keyed on
-- auth user id and meters API executions for that person. What the upsell
-- storefront moves money for is a CLIENT (a CRM sub-location) and an AGENCY (a
-- company). Sixteen profiles already point at the single location
-- `nphConTwfHcVE1oA0uep`, so a user-keyed balance means the colleague who tops
-- up is the only one who can spend it, and the balance disappears when they
-- leave. The thing that is sold to, billed and refilled is the location and the
-- company. user_wallets is untouched — nothing is migrated, nothing is deleted.
--
-- ONE TABLE FOR BOTH SCOPES, because the spec is explicit that client wallets
-- and the agency wallet are "the same machinery". Two tables would be two
-- ledgers, two charge functions and eventually two answers to "what is the
-- balance".
--
-- EVERY MOVEMENT WRITES AN ENTRY, AND balance_after IS STORED ON IT. A wallet
-- without a ledger is a lawsuit; a ledger you have to replay from zero to audit
-- is a lawsuit with extra steps. The entry carries the balance it produced, so
-- any single row can be checked against its neighbours.
--
-- MODE IS ON THE MONEY, NOT IN THE CODE. Until the billing-rails probe (W1)
-- and Mike's ratification land, every movement is mode='test'. Keeping it as a
-- column means test history stays visible and distinguishable forever instead
-- of being wiped when real charges turn on — and a report that forgets to
-- filter shows the mode rather than silently mixing play money with real.
--
-- REF IS AN IDEMPOTENCY KEY. A double-clicked upgrade button must not debit
-- twice. (scope, scope_id, ref) is unique where ref is present, and the credit
-- and charge functions treat a repeat as a replay: they return the current
-- balance and move nothing.
--
-- BALANCE CANNOT GO NEGATIVE. It is a check constraint, not a convention in
-- the caller — the caller is where "we checked first" races another request.

create table if not exists public.scoped_wallets (
  scope       text not null check (scope in ('location', 'company')),
  scope_id    text not null check (scope_id <> ''),
  -- The agency that owns this wallet. Present on BOTH scopes so every client
  -- wallet can be listed, summed and audited by the agency that sells to it.
  company_id  text not null check (company_id <> ''),

  balance_cents          integer not null default 0 check (balance_cents >= 0),
  lifetime_credit_cents  integer not null default 0 check (lifetime_credit_cents >= 0),
  lifetime_debit_cents   integer not null default 0 check (lifetime_debit_cents  >= 0),

  -- Agency auto-refill. Only meaningful on scope='company'; both values are set
  -- by the agency (config, never a constant in code). Enabled with either value
  -- missing is refused by the check rather than guessed at.
  autorefill_enabled       boolean not null default false,
  autorefill_trigger_cents integer check (autorefill_trigger_cents is null or autorefill_trigger_cents >= 0),
  autorefill_amount_cents  integer check (autorefill_amount_cents  is null or autorefill_amount_cents  > 0),
  constraint scoped_wallets_autorefill_complete check (
    autorefill_enabled = false
    or (autorefill_trigger_cents is not null and autorefill_amount_cents is not null)
  ),

  currency    text not null default 'usd',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (scope, scope_id)
);

create index if not exists scoped_wallets_company_idx on public.scoped_wallets (company_id);

comment on table public.scoped_wallets is
  'Prepaid wallet for a CRM sub-location (scope=location) or an agency (scope=company). Balance in integer cents, never negative. Movements are in scoped_wallet_entries.';


create table if not exists public.scoped_wallet_entries (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null check (scope in ('location', 'company')),
  scope_id    text not null check (scope_id <> ''),
  company_id  text not null check (company_id <> ''),

  -- Signed. Positive credits, negative debits, never zero — a zero-value
  -- movement is a bug that would otherwise sit in the ledger looking deliberate.
  delta_cents integer not null check (delta_cents <> 0),

  kind        text not null check (kind in (
                'topup', 'grant', 'refill', 'upgrade', 'usage', 'adjustment', 'refund'
              )),
  -- 'test' until W1 + ratification. Real money is a value here, not a deploy.
  mode        text not null default 'test' check (mode in ('test', 'live')),

  description text,
  -- Idempotency key. Unique per wallet when present; see the unique index below.
  ref         text,
  -- The balance this movement produced. Stored so one row can be audited alone.
  balance_after integer not null check (balance_after >= 0),
  -- Who caused it: an email, 'system', or a job name. Never a token.
  actor       text,

  created_at  timestamptz not null default now()
);

create index if not exists scoped_wallet_entries_wallet_idx
  on public.scoped_wallet_entries (scope, scope_id, created_at desc);
create index if not exists scoped_wallet_entries_company_idx
  on public.scoped_wallet_entries (company_id, created_at desc);
create unique index if not exists scoped_wallet_entries_ref_key
  on public.scoped_wallet_entries (scope, scope_id, ref) where ref is not null;

comment on table public.scoped_wallet_entries is
  'Immutable ledger for scoped_wallets. One row per movement, carrying the balance it produced. ref is an idempotency key: a repeat is a replay, not a second charge.';


-- Atomic credit. Creates the wallet on first use. Returns the new balance.
-- A repeated ref returns the CURRENT balance and moves nothing.
create or replace function public.scoped_wallet_credit(
  p_scope text, p_scope_id text, p_company text, p_cents integer,
  p_kind text default 'topup', p_mode text default 'test',
  p_desc text default null, p_ref text default null, p_actor text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_bal integer;
begin
  if p_cents is null or p_cents <= 0 then
    raise exception 'credit amount must be positive (got %)', p_cents;
  end if;

  if p_ref is not null and exists (
    select 1 from scoped_wallet_entries
     where scope = p_scope and scope_id = p_scope_id and ref = p_ref
  ) then
    -- Replay. Say nothing happened by changing nothing.
    select balance_cents into v_bal from scoped_wallets
      where scope = p_scope and scope_id = p_scope_id;
    return coalesce(v_bal, 0);
  end if;

  insert into scoped_wallets (scope, scope_id, company_id, balance_cents, lifetime_credit_cents)
  values (p_scope, p_scope_id, p_company, p_cents, p_cents)
  on conflict (scope, scope_id) do update
    set balance_cents         = scoped_wallets.balance_cents + p_cents,
        lifetime_credit_cents = scoped_wallets.lifetime_credit_cents + p_cents,
        updated_at            = now()
  returning balance_cents into v_bal;

  insert into scoped_wallet_entries
    (scope, scope_id, company_id, delta_cents, kind, mode, description, ref, balance_after, actor)
  values (p_scope, p_scope_id, p_company, p_cents, p_kind, p_mode, p_desc, p_ref, v_bal, p_actor);

  return v_bal;
end $$;

-- Atomic charge. Returns the new balance, or -1 when the wallet cannot cover it
-- (and in that case nothing is written — no balance change, no ledger row).
-- A repeated ref returns the current balance and charges nothing.
create or replace function public.scoped_wallet_charge(
  p_scope text, p_scope_id text, p_company text, p_cents integer,
  p_kind text default 'usage', p_mode text default 'test',
  p_desc text default null, p_ref text default null, p_actor text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_bal integer;
begin
  if p_cents is null or p_cents <= 0 then
    raise exception 'charge amount must be positive (got %)', p_cents;
  end if;

  if p_ref is not null and exists (
    select 1 from scoped_wallet_entries
     where scope = p_scope and scope_id = p_scope_id and ref = p_ref
  ) then
    select balance_cents into v_bal from scoped_wallets
      where scope = p_scope and scope_id = p_scope_id;
    return coalesce(v_bal, 0);
  end if;

  update scoped_wallets
     set balance_cents       = balance_cents - p_cents,
         lifetime_debit_cents = lifetime_debit_cents + p_cents,
         updated_at          = now()
   where scope = p_scope and scope_id = p_scope_id and balance_cents >= p_cents
  returning balance_cents into v_bal;

  if not found then
    return -1;  -- insufficient, or no wallet at all. Caller must not proceed.
  end if;

  insert into scoped_wallet_entries
    (scope, scope_id, company_id, delta_cents, kind, mode, description, ref, balance_after, actor)
  values (p_scope, p_scope_id, p_company, -p_cents, p_kind, p_mode, p_desc, p_ref, v_bal, p_actor);

  return v_bal;
end $$;


-- Money and the agency's refill card. Service role only, same rule as every
-- other credential-adjacent table here — anon must never reach a balance.
alter table public.scoped_wallets        enable row level security;
alter table public.scoped_wallet_entries enable row level security;

drop policy if exists "service role manages scoped wallets" on public.scoped_wallets;
create policy "service role manages scoped wallets"
  on public.scoped_wallets for all to service_role using (true) with check (true);

drop policy if exists "service role manages scoped wallet entries" on public.scoped_wallet_entries;
create policy "service role manages scoped wallet entries"
  on public.scoped_wallet_entries for all to service_role using (true) with check (true);
