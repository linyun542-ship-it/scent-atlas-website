revoke all on function public.create_scent_order(text,jsonb),public.find_scent_order(text,uuid),public.list_scent_orders(text),public.update_scent_order(text,uuid,integer,jsonb) from authenticated;
alter table scent_atlas_private.access enable row level security;
