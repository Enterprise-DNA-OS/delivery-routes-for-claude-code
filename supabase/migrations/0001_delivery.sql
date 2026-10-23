create schema delivery;
create function delivery.touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table delivery.drivers (
 id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true,
 licence_until date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table delivery.vehicles (
 id uuid primary key default gen_random_uuid(), name text not null unique, capacity numeric not null check(capacity>0),
 inspection_until date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table delivery.orders (
 id uuid primary key default gen_random_uuid(), external_id text unique, name text not null, address text not null,
 location text not null, due date not null, window_start integer not null default 480 check(window_start between 0 and 1439),
 window_end integer not null default 1020 check(window_end between 1 and 1440), service_minutes integer not null default 10 check(service_minutes between 1 and 330),
 units numeric not null default 1 check(units>0), status text not null default 'pending' check(status in ('pending','delivered','failed')),
 notes text not null default '', planning_ready boolean not null default true, source jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(window_end>window_start));
create table delivery.travel (
 id uuid primary key default gen_random_uuid(), origin text not null, destination text not null,
 minutes integer not null check(minutes between 1 and 330), evidence text not null, verified_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(origin,destination), check(origin<>destination));
create table delivery.routes (
 id uuid primary key default gen_random_uuid(), name text not null unique, driver_id uuid not null references delivery.drivers,
 vehicle_id uuid not null references delivery.vehicles, route_date date not null, depot text not null, start_minute integer not null,
 finish_minute integer not null, work_minutes integer not null, break_minutes integer not null,
 capacity_used numeric not null, timeline jsonb not null default '[]', fingerprint text not null, status text not null default 'draft' check(status in ('draft','released','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table delivery.stops (
 id uuid primary key default gen_random_uuid(), route_id uuid not null references delivery.routes,
 order_id uuid not null references delivery.orders, sequence integer not null, arrival_minute integer not null, departure_minute integer not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(route_id,order_id), unique(route_id,sequence));
create table delivery.outcomes (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references delivery.orders,
 outcome text not null check(outcome in ('delivered','failed')), evidence text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table delivery.work (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references delivery.drivers,
 started_at timestamptz not null, ended_at timestamptz not null, kind text not null check(kind in ('driving','loading','other')),
 evidence text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ended_at>started_at));
create table delivery.audit (
 id uuid primary key default gen_random_uuid(), action text not null, actor text not null, detail jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on delivery.drivers for each row execute function delivery.touch();
alter table delivery.drivers enable row level security;
revoke all on delivery.drivers from public;
create trigger touch before update on delivery.vehicles for each row execute function delivery.touch();
alter table delivery.vehicles enable row level security;
revoke all on delivery.vehicles from public;
create trigger touch before update on delivery.orders for each row execute function delivery.touch();
alter table delivery.orders enable row level security;
revoke all on delivery.orders from public;
create trigger touch before update on delivery.travel for each row execute function delivery.touch();
alter table delivery.travel enable row level security;
revoke all on delivery.travel from public;
create trigger touch before update on delivery.routes for each row execute function delivery.touch();
alter table delivery.routes enable row level security;
revoke all on delivery.routes from public;
create trigger touch before update on delivery.stops for each row execute function delivery.touch();
alter table delivery.stops enable row level security;
revoke all on delivery.stops from public;
create trigger touch before update on delivery.outcomes for each row execute function delivery.touch();
alter table delivery.outcomes enable row level security;
revoke all on delivery.outcomes from public;
create trigger touch before update on delivery.work for each row execute function delivery.touch();
alter table delivery.work enable row level security;
revoke all on delivery.work from public;
create trigger touch before update on delivery.audit for each row execute function delivery.touch();
alter table delivery.audit enable row level security;
revoke all on delivery.audit from public;

create view delivery.order_desk as
 select o.id,o.name,o.location,o.due,o.units,o.status,o.window_start,o.window_end,
 r.name as route,r.status as route_status from delivery.orders o
 left join delivery.stops s on s.order_id=o.id and exists(select 1 from delivery.routes x where x.id=s.route_id and x.status<>'cancelled')
 left join delivery.routes r on r.id=s.route_id;
create view delivery.route_board as
 select r.id,r.name,r.route_date,d.name driver,v.name vehicle,r.status,r.start_minute,r.finish_minute,r.work_minutes,r.break_minutes,
 r.capacity_used,v.capacity,count(s.id)::int stops,
 count(s.id) filter(where o.status='delivered')::int delivered,
 count(s.id) filter(where o.status='failed')::int failed
 from delivery.routes r join delivery.drivers d on d.id=r.driver_id join delivery.vehicles v on v.id=r.vehicle_id
 left join delivery.stops s on s.route_id=r.id left join delivery.orders o on o.id=s.order_id
 group by r.id,d.name,v.name,v.capacity;
create view delivery.exceptions as
 select id,name,'overdue delivery' reason from delivery.orders where status='pending' and due<current_date
 union all select id,name,'import needs planning confirmation' from delivery.orders where not planning_ready
 union all select id,name,'failed delivery' from delivery.orders where status='failed'
 union all select id,name,'driver licence expired' from delivery.drivers where licence_until<current_date
 union all select id,name,'vehicle inspection expired' from delivery.vehicles where inspection_until<current_date;
