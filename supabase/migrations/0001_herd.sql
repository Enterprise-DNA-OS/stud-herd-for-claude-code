create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create table properties (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 country text not null check(country in ('AU','NZ')), region text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table animals (
 id uuid primary key default gen_random_uuid(), tag text not null unique, name text not null,
 eid text unique, sex text not null check(sex in ('F','M','S')), born date not null,
 breed text not null default '', mob text not null default '', property_id uuid not null references properties,
 sire_tag text, dam_tag text, society_id text, tagged date, registered date,
 status text not null default 'active' check(status in ('active','sold','dead')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(sire_tag is null or sire_tag <> tag), check(dam_tag is null or dam_tag <> tag),
 check(tagged is null or tagged >= born), check(registered is null or (tagged is not null and registered >= tagged))
);
create table weights (
 id uuid primary key default gen_random_uuid(), external_id text not null unique,
 animal_id uuid not null references animals, weighed date not null, kg numeric(8,2) not null check(kg>0),
 group_code text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(animal_id,weighed)
);
create table joinings (
 id uuid primary key default gen_random_uuid(), external_id text not null unique,
 dam_id uuid not null references animals, sire_id uuid not null references animals,
 joined date not null, due date not null, method text not null default 'natural' check(method in ('natural','insemination','embryo')),
 result text not null default 'pending' check(result in ('pending','pregnant','empty','calved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(dam_id<>sire_id), check(due>joined)
);
create table calvings (
 id uuid primary key default gen_random_uuid(), external_id text not null unique,
 joining_id uuid references joinings, dam_id uuid not null references animals, calf_id uuid not null unique references animals,
 calved date not null, assistance text not null default 'unassisted', birth_kg numeric(6,2) check(birth_kg>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(dam_id<>calf_id)
);
create table treatments (
 id uuid primary key default gen_random_uuid(), external_id text not null unique, animal_id uuid not null references animals,
 treated date not null, product text not null, batch text, product_expiry date, dose text,
 meat_clear date, export_clear date, instruction_ref text, operator text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(meat_clear is null or meat_clear>=treated), check(export_clear is null or export_clear>=treated)
);
create table movements (
 id uuid primary key default gen_random_uuid(), external_id text not null unique, animal_id uuid not null references animals,
 from_code text not null, to_code text not null, country text not null check(country in ('AU','NZ')),
 moved_at timestamptz not null, direction text not null check(direction in ('incoming','outgoing')),
 recorded_at timestamptz, receipt text, document_ref text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(from_code<>to_code)
);
create table ebvs (
 id uuid primary key default gen_random_uuid(), external_id text not null unique, animal_id uuid not null references animals,
 trait text not null, value numeric not null, accuracy numeric check(accuracy between 0 and 100), run_date date not null,
 analysis text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(animal_id,trait,run_date,analysis)
);
create table lots (
 id uuid primary key default gen_random_uuid(), external_id text not null unique, animal_id uuid not null references animals,
 sale text not null, lot_no text not null, sale_date date not null, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(sale,lot_no)
);
create table notes (
 id uuid primary key default gen_random_uuid(), animal_id uuid not null references animals, body text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare n text; begin
 foreach n in array array['properties','animals','weights','joinings','calvings','treatments','movements','ebvs','lots','notes'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',n);
 end loop;
end $$;
create index weights_animal on weights(animal_id,weighed desc);
create index treatments_animal on treatments(animal_id);
create index movements_animal on movements(animal_id);
create view growth as
select a.id,a.tag,a.name,a.mob,a.status,w.weighed,w.kg,
 current_date-w.weighed as days_since_weight,
 case when w.weighed>prev.weighed then round((w.kg-prev.kg)/(w.weighed-prev.weighed),3) end as gain_kg_day
from animals a
left join lateral (select * from weights where animal_id=a.id order by weighed desc limit 1) w on true
left join lateral (select * from weights where animal_id=a.id and weighed<w.weighed order by weighed desc limit 1) prev on true;
create view calving_watch as
select j.id,a.tag as dam,s.tag as sire,j.joined,j.due,j.result,j.method,j.due-current_date as days_until_due
from joinings j join animals a on a.id=j.dam_id join animals s on s.id=j.sire_id
where a.status='active' and j.result in ('pending','pregnant') and not exists(select 1 from calvings c where c.joining_id=j.id);
create view treatment_holds as
select t.id,a.tag,t.product,t.treated,t.batch,t.product_expiry,t.dose,t.meat_clear,t.export_clear,
 case when t.meat_clear is null or t.export_clear is null or nullif(t.instruction_ref,'') is null then 'review instructions'
 when greatest(t.meat_clear,t.export_clear)>current_date then 'withholding active' else 'dates elapsed: verify destination' end as review,
 (t.batch is null or t.product_expiry is null or t.dose is null) as missing_record
from treatments t join animals a on a.id=t.animal_id where a.status='active';
create view movement_watch as
select m.id,a.tag,m.country,m.direction,m.from_code,m.to_code,m.moved_at,
 m.moved_at+interval '48 hours' as reminder_at,m.recorded_at,m.receipt,m.document_ref,
 case when nullif(m.receipt,'') is null or m.recorded_at is null then
 case when now()>m.moved_at+interval '48 hours' then 'receipt overdue' else 'receipt pending' end
 when m.recorded_at>m.moved_at+interval '48 hours' then 'recorded after reminder' else 'receipt recorded' end as review
from movements m join animals a on a.id=m.animal_id;
create view sale_readiness as
select l.id,l.sale,l.lot_no,l.sale_date,a.tag,a.name,g.kg,g.gain_kg_day,
 (select count(*)::int from treatments t where t.animal_id=a.id and
 (t.meat_clear is null or t.export_clear is null or nullif(t.instruction_ref,'') is null or greatest(t.meat_clear,t.export_clear)>l.sale_date)) as treatment_reviews,
 (select count(*)::int from movements m where m.animal_id=a.id and (m.recorded_at is null or nullif(m.receipt,'') is null)) as missing_receipts,
 (a.eid is null) as missing_eid, (a.society_id is null) as missing_society_id,a.status
from lots l join animals a on a.id=l.animal_id left join growth g on g.id=a.id;
create view herd_attention as
select a.tag,'weight missing or stale'::text as reason,coalesce(g.days_since_weight::text,'never') as detail
from animals a join growth g on g.id=a.id where a.status='active' and (g.weighed is null or g.days_since_weight>90)
union all select dam,'calving overdue',due::text from calving_watch where due<current_date
union all select tag,review,product from treatment_holds where review<>'dates elapsed: verify destination' or missing_record
union all select tag,review,coalesce(receipt,'no receipt') from movement_watch where review<>'receipt recorded';
