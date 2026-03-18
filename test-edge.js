const url = 'https://cbvcgofjytbmjwebygkc.supabase.co/functions/v1/admin-create-user';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidmNnb2ZqeXRibWp3ZWJ5Z2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTU3MTcsImV4cCI6MjA4OTI3MTcxN30.bz40cohjdayMhTtt-kjcUOY6006LwdSeNmlu6Z-6L94';

// Use a fake token to pass authHeader existence check, 
// wait, the Edge function needs a VALID token from an Admin user to pass `auth.getUser`!
// Without a valid token, it will return 401 "Unauthorized: Invalid token".
