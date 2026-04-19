-- Example queries for common app features

-- 1. Promote a signed-up user to supervisor or manager
update public.profiles set role = 'supervisor' where email = 'supervisor@logistics.com';
update public.profiles set role = 'manager' where email = 'manager@logistics.com';

-- 2. Insert a vehicle
insert into public.vehicles (
    id,
    plate_number,
    model,
    status,
    fuel_level,
    mileage,
    location,
    last_service_date,
    fuel_type
) values (
    'veh-001',
    'KL-01-AA-1234',
    'Tata Ace',
    'active',
    90,
    18234,
    '{"lat":10.0064,"lng":76.3611}',
    '2026-04-10',
    'diesel'
);

-- 3. Inspect active trips
select id, status, driver_id, vehicle_id, estimated_distance
from public.trips
where status in ('assigned', 'in-progress')
order by created_at desc;

-- 4. Inspect pending fuel entries
select id, driver_id, vehicle_id, cost, status, timestamp
from public.fuel_entries
where status = 'pending'
order by timestamp desc;

-- 5. Inspect unresolved alerts
select id, type, severity, message, trip_id, resolved
from public.alerts
where resolved = false
order by timestamp desc;
