const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('--- Profiles ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error(pError);
    else console.table(profiles);

    console.log('--- Auth Users ---');
    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) console.error(uError);
    else console.table(users.map(u => ({ id: u.id, email: u.email, status: u.user_metadata?.status })));
}

diagnose();
