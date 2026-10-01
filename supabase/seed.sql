-- Blushique Sprint 2 reproducible seed.
-- Run after migration. Replace the UUID below with the Auth user created in Supabase if needed.

insert into public.profiles (id, role, full_name)
select id, 'admin', 'Blushique Administrator'
from auth.users
where email = 'admin@blushique.test'
on conflict (id) do update set role = 'admin', full_name = excluded.full_name;

insert into public.categories (name, slug, parent_id)
values ('Face', 'face', null)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Lip Makeup', 'lip-makeup', id from public.categories where slug = 'face'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Eye Makeup', 'eye-makeup', id from public.categories where slug = 'face'
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, status)
select id, 'Velvet Matte Lipstick', 'velvet-matte-lipstick', 'Budget-friendly matte lipstick for everyday looks.', 'draft'
from public.categories where slug = 'lip-makeup'
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, status)
select id, 'Glow Cushion Foundation', 'glow-cushion-foundation', 'Lightweight cushion foundation with buildable coverage.', 'draft'
from public.categories where slug = 'face'
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, status)
select id, 'Everyday Eye Palette', 'everyday-eye-palette', 'Compact neutral palette for daily and trend looks.', 'draft'
from public.categories where slug = 'eye-makeup'
on conflict (slug) do nothing;

insert into public.variants (product_id, option_values)
select p.id, v.options::jsonb
from public.products p
cross join (values
  ('velvet-matte-lipstick', '{"shade":"Rose Nude"}'),
  ('velvet-matte-lipstick', '{"shade":"Berry"}'),
  ('glow-cushion-foundation', '{"shade":"Light"}'),
  ('everyday-eye-palette', '{"size":"Standard"}')
) v(slug, options)
where p.slug = v.slug
and not exists (select 1 from public.variants x where x.product_id=p.id and x.option_values=v.options::jsonb);

insert into public.skus (product_id, variant_id, sku_code, price, stock_quantity, is_active)
select p.id, v.id, x.sku_code, x.price, x.stock, true
from (values
  ('velvet-matte-lipstick','VML-ROSE-01',799.00,25),
  ('velvet-matte-lipstick','VML-BERRY-01',799.00,18),
  ('glow-cushion-foundation','GCF-LIGHT-01',1299.00,12),
  ('everyday-eye-palette','EEP-STD-01',1599.00,10)
) x(slug, sku_code, price, stock)
join public.products p on p.slug=x.slug
join public.variants v on v.product_id=p.id
where (x.slug='velvet-matte-lipstick' and v.option_values->>'shade' = case when x.sku_code like '%ROSE%' then 'Rose Nude' else 'Berry' end)
   or (x.slug='glow-cushion-foundation' and v.option_values->>'shade'='Light')
   or (x.slug='everyday-eye-palette' and v.option_values->>'size'='Standard')
on conflict (sku_code) do nothing;

-- Intentionally unavailable combination: a Black shade for Velvet Matte Lipstick is not inserted at all.
update public.products set status='published' where slug in ('velvet-matte-lipstick','glow-cushion-foundation','everyday-eye-palette');


