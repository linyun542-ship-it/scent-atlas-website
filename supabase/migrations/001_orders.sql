-- Apply once in the dedicated Scent Atlas project's SQL editor.
create table public.scent_atlas_orders (
  id uuid primary key,
  idempotency_key uuid not null unique,
  request_hash text not null check (length(request_hash) = 64),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  version integer not null default 0 check (version >= 0),
  status text not null check (status in ('Demo order received','Demo preparing','Demo ready','Demo completed','Demo cancelled')),
  created_at timestamptz not null default now(),
  check (payload->>'id' = id::text),
  check (payload->>'status' = status),
  check ((payload->>'version')::integer = version)
);
create index scent_atlas_orders_created_at on public.scent_atlas_orders(created_at desc);
alter table public.scent_atlas_orders enable row level security;
revoke all on public.scent_atlas_orders from anon, authenticated;
grant select, insert, update on public.scent_atlas_orders to service_role;
-- No public RLS policies: all access goes through the server's validated API.
-- Set app_metadata.role = 'admin' on approved Auth users from the dashboard/admin API.
-- Never authorize from user_metadata or expose the secret/service-role key to the browser.

-- Scoped RPC gateway: the server uses a purpose-specific order token, not a
-- project-wide service-role secret. Public keys alone cannot access orders.
create schema scent_atlas_private;
revoke all on schema scent_atlas_private from public, anon, authenticated;
create table scent_atlas_private.access (singleton boolean primary key default true check(singleton), token_hash text not null);
revoke all on scent_atlas_private.access from public, anon, authenticated;
create function scent_atlas_private.require_token(p_token text) returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if p_token is null or not exists(select 1 from scent_atlas_private.access where token_hash = encode(sha256(convert_to(p_token,'UTF8')),'hex')) then
    raise exception 'Invalid order gateway token' using errcode = '42501';
  end if;
end $$;
revoke all on function scent_atlas_private.require_token(text) from public;

create function public.create_scent_order(p_token text, p_row jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare saved public.scent_atlas_orders;
begin
  perform scent_atlas_private.require_token(p_token);
  insert into public.scent_atlas_orders(id,idempotency_key,request_hash,payload,version,status)
  values((p_row->>'id')::uuid,(p_row->>'idempotency_key')::uuid,p_row->>'request_hash',p_row->'payload',0,'Demo order received')
  on conflict(idempotency_key) do nothing;
  select * into saved from public.scent_atlas_orders where idempotency_key=(p_row->>'idempotency_key')::uuid;
  if saved.request_hash <> p_row->>'request_hash' then raise exception 'Checkout reference reused' using errcode='23505'; end if;
  return saved.payload;
end $$;
create function public.find_scent_order(p_token text,p_id uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb;
begin
  perform scent_atlas_private.require_token(p_token);
  select payload into result from public.scent_atlas_orders where id=p_id;
  return result;
end $$;
create function public.list_scent_orders(p_token text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb;
begin
  perform scent_atlas_private.require_token(p_token);
  select coalesce(jsonb_agg(r.payload order by r.created_at desc),'[]'::jsonb) into result from (select payload,created_at from public.scent_atlas_orders order by created_at desc limit 100) r;
  return result;
end $$;
create function public.update_scent_order(p_token text,p_id uuid,p_expected integer,p_order jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare saved jsonb;
begin
  perform scent_atlas_private.require_token(p_token);
  if (p_order->>'version')::integer <> p_expected+1 then raise exception 'Invalid version' using errcode='40001'; end if;
  update public.scent_atlas_orders set payload=p_order,status=p_order->>'status',version=p_expected+1
  where id=p_id and version=p_expected and case status
    when 'Demo order received' then p_order->>'status' in ('Demo preparing','Demo cancelled')
    when 'Demo preparing' then p_order->>'status' in ('Demo ready','Demo cancelled')
    when 'Demo ready' then p_order->>'status' = 'Demo completed' else false end
  returning payload into saved;
  if saved is null then raise exception 'Order changed or transition invalid' using errcode='40001'; end if;
  return saved;
end $$;
revoke all on function public.create_scent_order(text,jsonb),public.find_scent_order(text,uuid),public.list_scent_orders(text),public.update_scent_order(text,uuid,integer,jsonb) from public;
grant execute on function public.create_scent_order(text,jsonb),public.find_scent_order(text,uuid),public.list_scent_orders(text),public.update_scent_order(text,uuid,integer,jsonb) to anon;
