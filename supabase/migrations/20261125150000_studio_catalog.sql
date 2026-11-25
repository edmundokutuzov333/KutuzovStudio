-- Catalog only: no personal information or visitor writes.
create table public.studio_formats (
 id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
 product text not null check(product in ('card','badge')),
 label text not null check(char_length(label) between 1 and 100),
 width_mm numeric(6,2) not null check(width_mm between 25 and 200),
 height_mm numeric(6,2) not null check(height_mm between 25 and 200),
 bleed_mm numeric(4,2) not null check(bleed_mm between 0 and 5),
 safe_mm numeric(4,2) not null check(safe_mm between 2 and 8),
 position integer not null check(position >= 0),
 published boolean not null default true,
 check (least(width_mm,height_mm)>2*safe_mm)
);
alter table public.studio_formats enable row level security;
revoke all on public.studio_formats from public, anon, authenticated;
grant select (id,product,label,width_mm,height_mm,bleed_mm,safe_mm,position) on public.studio_formats to anon, authenticated;
create policy studio_formats_public_read on public.studio_formats for select to anon, authenticated using (published);
create index studio_formats_published_order on public.studio_formats(product,position,id) where published;
insert into public.studio_formats(id,product,label,width_mm,height_mm,bleed_mm,safe_mm,position) values
('eu-card','card','Europeu · 85 × 55',85,55,3,3,10),
('wide-card','card','Horizontal · 90 × 50',90,50,3,3,20),
('us-card','card','Americano · 88,9 × 50,8',88.9,50.8,3,3,30),
('square-card','card','Quadrado · 55 × 55',55,55,3,3,40),
('cr80','badge','PVC · 85,60 × 53,98',85.6,53.98,2,3,10),
('vertical-badge','badge','Vertical · 54 × 86',54,86,3,4,20),
('event-badge','badge','Evento · 70 × 100',70,100,3,4,30),
('conference-badge','badge','Conferência · 90 × 120',90,120,3,5,40);
