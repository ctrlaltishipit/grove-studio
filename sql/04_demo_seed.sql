-- ============================================================
-- Grove — 04_demo_seed.sql   ← THE DEMO FIXTURE. DO NOT SKIP THIS.
--
-- 24 notes across three observers with one deliberate, planted
-- disagreement. This is the safety net the whole demo rests on: if the
-- live two-browser capture wobbles on stage, you still have a session
-- that synthesises into a screen that sells the product.
--
-- Run AFTER 01_schema.sql and 02_functions.sql. Run it with RLS OFF (before
-- stage S2) or from the SQL editor, which uses the service role and bypasses
-- RLS anyway.
--
-- The explicit colour_index values below are overwritten by
-- trg_participants_colour (01_schema.sql); the trigger assigns 0, 1, 2 in
-- VALUES order, which is the same result. They stay for readability.
--
-- HOW TO DEMO WITH IT
--   1. Run this file.
--   2. In the app, Join with code  GRVDEM  and your own display name.
--      You become Observer 4 with an empty lane.
--   3. Type two or three notes live — that is Capture Mode on camera.
--   4. Press Synthesise. Findings come back ranked 4/3/2/1 with the
--      cost-versus-wait-time disagreement flagged in amber.
--
-- RESET:  delete from public.sessions where join_code = 'GRVDEM';
--         (everything below cascades)
-- ============================================================

delete from public.sessions where join_code = 'GRVDEM';

insert into public.sessions (id, title, research_question, join_code, created_by, status)
values (
  '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71',
  'Clinic booking — discovery interview 04',
  'Why do patients who start an online booking abandon it before confirming?',
  'GRVDEM',
  gen_random_uuid(),
  'live'
);

insert into public.participants (id, session_id, display_name, user_id, colour_index, joined_at) values
  ('a1111111-1111-4111-8111-111111111111', '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71', 'Priya R.',  gen_random_uuid(), 0, now() - interval '42 minutes'),
  ('a2222222-2222-4222-8222-222222222222', '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71', 'Arjun M.',  gen_random_uuid(), 1, now() - interval '41 minutes'),
  ('a3333333-3333-4333-8333-333333333333', '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71', 'Nikhil S.', gen_random_uuid(), 2, now() - interval '40 minutes');

insert into public.notes (session_id, participant_id, body, kind, created_at) values
-- ---------- Priya R. (8) ----------
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Opened with "I have tried three times to book online and given up each time."','quote', now() - interval '38 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','She stopped at the insurance field. Said she did not have the policy number on her.','observation', now() - interval '35 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Confirmed her last appointment over WhatsApp with the clinic, not in the app.','observation', now() - interval '31 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Reminder SMS arrived the same morning. No use to her — she was already committed by then.','observation', now() - interval '27 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Cost was the main reason she delayed booking. She said consultations "add up".','observation', now() - interval '23 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Asked about price twice before choosing which doctor to book.','observation', now() - interval '20 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Android phone, mobile data, booking from Hyderabad.','observation', now() - interval '17 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a1111111-1111-4111-8111-111111111111','Said she would still recommend it to her sister — "better than calling".','quote', now() - interval '12 minutes'),

-- ---------- Arjun M. (8) ----------
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Abandoned at the insurance details step — did not have the number to hand.','observation', now() - interval '36 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','She trusts a WhatsApp reply from the front desk more than the confirmation screen in the app.','observation', now() - interval '32 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Long pause before she answered the question about trusting the app.','observation', now() - interval '29 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','"If I do not get a message from a person, I assume it did not work."','quote', now() - interval '28 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Uncomfortable that the receptionist can see her full visit history on screen.','observation', now() - interval '25 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Books appointments for her mother on the same account. No way to keep the two separate.','observation', now() - interval '21 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Was confused about which profile an existing booking belonged to.','observation', now() - interval '18 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a2222222-2222-4222-8222-222222222222','Tapped back four times looking for the list of available slots.','observation', now() - interval '14 minutes'),

-- ---------- Nikhil S. (8) ----------
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','The insurance number step is where she gave up. She said it happened twice.','observation', now() - interval '34 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','Ends up phoning the clinic anyway to check the booking actually landed.','observation', now() - interval '30 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','Said a reminder one day earlier would have let her move the appointment.','observation', now() - interval '26 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','Privacy worry — the front desk screen faces the waiting queue.','observation', now() - interval '24 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','She said cost was not really the issue. It was not knowing how long she would wait.','observation', now() - interval '22 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','Wait-time uncertainty came up three times. Price came up once, in passing.','observation', now() - interval '19 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','The app logged her out between visits and she had to re-enter the OTP.','observation', now() - interval '16 minutes'),
('9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71','a3333333-3333-4333-8333-333333333333','She went to the doctor list first rather than using search.','observation', now() - interval '13 minutes');

-- ---------- verify ----------
select p.display_name, count(n.id) as notes
from public.participants p
left join public.notes n on n.participant_id = p.id
where p.session_id = '9e1c7f30-4a2b-4d51-8f6a-2c3d4e5f6a71'
group by p.display_name
order by p.display_name;
-- Expected: Arjun M. 8, Nikhil S. 8, Priya R. 8   (24 notes, three lanes)
