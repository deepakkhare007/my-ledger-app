-- Local/dev seed data only. Run via `supabase db reset` (which applies
-- migrations then this file) against your LOCAL Supabase instance — never
-- against a hosted project. No real people: the phone number below is
-- reserved for fictional use (TRAI/India test range), and the shop names
-- match the ones used in the replica-build vertical slice.

insert into auth.users (
  id, instance_id, aud, role, phone, phone_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  '+910000000001', now(),
  now(), now(), '{"provider":"phone"}', '{}'
);
-- The on_auth_user_created trigger (0001_init.sql) now fires, creating a
-- profiles row and a default "My Shop" khata_books row for this user.

do $$
declare
  book_id uuid;
  cust1 uuid;
  cust2 uuid;
begin
  select id into book_id from public.khata_books
    where owner_id = '00000000-0000-0000-0000-000000000001' limit 1;

  insert into public.customers (khata_book_id, name, phone_number)
    values (book_id, 'Ramesh Kirana Store', '+919876500001')
    returning id into cust1;
  insert into public.customers (khata_book_id, name, phone_number)
    values (book_id, 'Suresh Medical', '+919876500002')
    returning id into cust2;

  insert into public.transactions
    (khata_book_id, customer_id, type, amount_cents, note, transaction_date, client_created_at)
  values
    (book_id, cust1, 'you_gave', 24000, '2 bags rice', '2026-11-05', '2026-11-05T10:00:00Z'),
    (book_id, cust2, 'you_gave', 12000, 'medicines', '2026-11-07', '2026-11-07T11:00:00Z');

  insert into public.transactions
    (khata_book_id, customer_id, type, amount_cents, payment_mode, note, transaction_date, client_created_at)
  values
    (book_id, cust2, 'you_got', 3500, 'cash', 'part payment', '2026-11-08', '2026-11-08T12:00:00Z');
end $$;
