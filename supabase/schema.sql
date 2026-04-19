-- Run this in the Supabase SQL editor for project:
-- https://jztvgecdawderaxgnhmt.supabase.co
--
-- Notes:
-- 1. New signups default to role = 'driver'.
-- 2. Promote supervisor/manager accounts manually after signup:
--    update public.profiles set role = 'supervisor' where email = 'supervisor@yourdomain.com';
--    update public.profiles set role = 'manager' where email = 'manager@yourdomain.com';

create extension if not exists "pgcrypto";

do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type public.user_role as enum ('manager', 'supervisor', 'driver');
    end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    name text not null,
    role public.user_role not null default 'driver',
    avatar text,
    license_number text,
    status text default 'available',
    current_vehicle_id text,
    is_live boolean not null default true,
    last_location_update timestamptz,
    duty_status text default 'on-duty',
    day_started_at timestamptz,
    day_ended_at timestamptz,
    on_break boolean not null default false,
    break_started_at timestamptz,
    break_type text,
    total_break_minutes integer not null default 0,
    last_activity_at timestamptz,
    current_location jsonb,
    last_delivery_proof jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicles (
    id text primary key,
    plate_number text not null unique,
    model text not null,
    status text not null default 'active',
    fuel_level numeric not null default 0,
    mileage numeric not null default 0,
    location jsonb not null default jsonb_build_object('lat', 0, 'lng', 0),
    last_service_date date,
    fuel_type text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trips (
    id text primary key,
    vehicle_id text references public.vehicles(id) on delete set null,
    driver_id uuid references public.profiles(id) on delete set null,
    supervisor_id uuid references public.profiles(id) on delete set null,
    status text not null,
    start_location jsonb not null,
    drops jsonb not null default '[]'::jsonb,
    start_time timestamptz,
    end_time timestamptz,
    estimated_distance numeric not null default 0,
    actual_distance numeric,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fuel_entries (
    id text primary key,
    trip_id text references public.trips(id) on delete cascade,
    driver_id uuid references public.profiles(id) on delete set null,
    vehicle_id text references public.vehicles(id) on delete set null,
    amount numeric not null default 0,
    cost numeric not null default 0,
    currency text not null default 'INR',
    odometer integer not null default 0,
    location text not null,
    pump_name text,
    fuel_type text,
    timestamp timestamptz not null default timezone('utc', now()),
    receipt_image text,
    status text not null default 'pending',
    verified_by uuid references public.profiles(id) on delete set null,
    approved_by uuid references public.profiles(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
    id text primary key,
    type text not null,
    severity text not null,
    message text not null,
    timestamp timestamptz not null default timezone('utc', now()),
    vehicle_id text references public.vehicles(id) on delete set null,
    trip_id text references public.trips(id) on delete cascade,
    resolved boolean not null default false,
    metadata jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_trips_driver_id on public.trips(driver_id);
create index if not exists idx_trips_status on public.trips(status);
create index if not exists idx_fuel_entries_driver_id on public.fuel_entries(driver_id);
create index if not exists idx_alerts_trip_id on public.alerts(trip_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_trips_updated_at on public.trips;
create trigger trg_trips_updated_at
before update on public.trips
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_fuel_entries_updated_at on public.fuel_entries;
create trigger trg_fuel_entries_updated_at
before update on public.fuel_entries
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_alerts_updated_at on public.alerts;
create trigger trg_alerts_updated_at
before update on public.alerts
for each row execute procedure public.set_updated_at();

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        email,
        name,
        role,
        license_number,
        status,
        duty_status,
        is_live,
        on_break,
        total_break_minutes
    )
    values (
        new.id,
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'driver'), '@', 1)),
        'driver',
        nullif(new.raw_user_meta_data ->> 'license_number', ''),
        'available',
        'on-duty',
        true,
        false,
        0
    )
    on conflict (id) do update
    set
        email = excluded.email,
        name = excluded.name,
        license_number = excluded.license_number;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.alerts enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
    auth.uid() = id
    or public.current_app_role() in ('manager', 'supervisor')
);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
on public.profiles
for update
to authenticated
using (
    auth.uid() = id
    or public.current_app_role() in ('manager', 'supervisor')
)
with check (
    auth.uid() = id
    or public.current_app_role() in ('manager', 'supervisor')
);

drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select"
on public.vehicles
for select
to authenticated
using (true);

drop policy if exists "vehicles_admin_manage" on public.vehicles;
create policy "vehicles_admin_manage"
on public.vehicles
for all
to authenticated
using (public.current_app_role() in ('manager', 'supervisor'))
with check (public.current_app_role() in ('manager', 'supervisor'));

drop policy if exists "vehicles_driver_update_assigned" on public.vehicles;
create policy "vehicles_driver_update_assigned"
on public.vehicles
for update
to authenticated
using (
    public.current_app_role() = 'driver'
    and exists (
        select 1
        from public.trips
        where trips.vehicle_id = vehicles.id
          and trips.driver_id = auth.uid()
          and trips.status in ('assigned', 'in-progress')
    )
)
with check (
    public.current_app_role() = 'driver'
    and exists (
        select 1
        from public.trips
        where trips.vehicle_id = vehicles.id
          and trips.driver_id = auth.uid()
          and trips.status in ('assigned', 'in-progress')
    )
);

drop policy if exists "trips_select" on public.trips;
create policy "trips_select"
on public.trips
for select
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
);

drop policy if exists "trips_insert" on public.trips;
create policy "trips_insert"
on public.trips
for insert
to authenticated
with check (public.current_app_role() in ('manager', 'supervisor'));

drop policy if exists "trips_update" on public.trips;
create policy "trips_update"
on public.trips
for update
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
)
with check (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
);

drop policy if exists "fuel_select" on public.fuel_entries;
create policy "fuel_select"
on public.fuel_entries
for select
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
);

drop policy if exists "fuel_insert" on public.fuel_entries;
create policy "fuel_insert"
on public.fuel_entries
for insert
to authenticated
with check (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
);

drop policy if exists "fuel_update" on public.fuel_entries;
create policy "fuel_update"
on public.fuel_entries
for update
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
)
with check (
    public.current_app_role() in ('manager', 'supervisor')
    or driver_id = auth.uid()
);

drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select"
on public.alerts
for select
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or created_by = auth.uid()
    or exists (
        select 1
        from public.trips
        where trips.id = alerts.trip_id
          and trips.driver_id = auth.uid()
    )
);

drop policy if exists "alerts_insert" on public.alerts;
create policy "alerts_insert"
on public.alerts
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "alerts_update" on public.alerts;
create policy "alerts_update"
on public.alerts
for update
to authenticated
using (
    public.current_app_role() in ('manager', 'supervisor')
    or created_by = auth.uid()
)
with check (
    public.current_app_role() in ('manager', 'supervisor')
    or created_by = auth.uid()
);

-- Example manual inserts for real fleet data:
-- insert into public.vehicles (id, plate_number, model, status, fuel_level, mileage, location, last_service_date, fuel_type)
-- values ('veh-001', 'KL-01-AA-1234', 'Tata Ace', 'active', 80, 12000, '{"lat":10.0,"lng":76.0}', '2026-04-01', 'diesel');
