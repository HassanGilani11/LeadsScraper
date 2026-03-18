-- We need to allow the fallback test user to insert leads and campaigns
-- without failing the auth.users foreign key constraint.

-- The easiest way is to push a dummy user directly into auth.users IF we had postgres access.
-- But we can also just alter the tables to temporarily drop the foreign keys, or better, 
-- create an anonymous testing user through a stored procedure that bypasses the API limits.

-- Actually, a better approach that doesn't break the schema is to create a function that 
-- inserts a user directly into auth.users.

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('d168fb98-1e43-4c90-bcd0-a92c4d6da201', 'test@example.com', '{"full_name": "Test User"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, user_id, email, full_name)
VALUES ('d168fb98-1e43-4c90-bcd0-a92c4d6da201', 'd168fb98-1e43-4c90-bcd0-a92c4d6da201', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.campaigns (id, user_id, name, status)
VALUES ('c277ea2f-0f62-4304-9db0-f57930113c41', 'd168fb98-1e43-4c90-bcd0-a92c4d6da201', 'Default Test Campaign', 'running')
ON CONFLICT (id) DO NOTHING;
