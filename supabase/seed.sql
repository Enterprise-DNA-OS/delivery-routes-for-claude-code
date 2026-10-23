insert into delivery.drivers(name,licence_until) values ('Aria Chen',current_date+180),('Lee North',current_date-2),('Lee South',current_date+120) on conflict do nothing;
insert into delivery.vehicles(name,capacity,inspection_until) values ('Van One',20,current_date+90),('Van Two',12,current_date-3) on conflict do nothing;
insert into delivery.orders(external_id,name,address,location,due,window_start,window_end,units,status,notes) values
 ('DEMO-1','Harbour Pantry','10 Example Wharf, Auckland','harbour',current_date,510,720,8,'pending','Fictional demonstration'),
 ('DEMO-2','Hilltop Grocer','20 Example Road, Auckland','hilltop',current_date,540,780,6,'pending','Fictional demonstration'),
 ('DEMO-3','Valley Cafe','30 Example Lane, Auckland','valley',current_date-2,480,960,3,'pending','Overdue demo order'),
 ('DEMO-4','Westside Bakery','40 Example Way, Auckland','westside',current_date-1,480,960,2,'failed','Closed on arrival') on conflict do nothing;
insert into delivery.travel(origin,destination,minutes,evidence,verified_on)
 select a,b,case when a='depot' or b='depot' then 25 else 20 end,'fictional demo travel time',current_date
 from unnest(array['depot','harbour','hilltop','valley','westside']) a cross join unnest(array['depot','harbour','hilltop','valley','westside']) b where a<>b on conflict do nothing;
insert into delivery.work(driver_id,started_at,ended_at,kind,evidence)
 select id,(current_date-1)+time '08:00',(current_date-1)+time '14:00','driving','fictional missing-break example'
 from delivery.drivers where name='Aria Chen' and not exists(select 1 from delivery.work);
