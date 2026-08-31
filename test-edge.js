import 'dotenv/config';
const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Use a fake token to pass authHeader existence check, 
// wait, the Edge function needs a VALID token from an Admin user to pass `auth.getUser`!
// Without a valid token, it will return 401 "Unauthorized: Invalid token".
