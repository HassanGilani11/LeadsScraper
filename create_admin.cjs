const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
    const email = 'syedhassangilani0@gmail.com';
    console.log(`Promoting user ${email} to Admin...`);

    // 1. Find the profile to get the user ID
    const { data: profiles, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email);

    if (findError) {
        console.error('Error searching profiles:', findError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.error(`User with email ${email} not found in profiles table.`);
        return;
    }

    const userId = profiles[0].id;
    console.log(`Found user ID: ${userId}`);

    // 2. Update the profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            role: 'Admin',
            status: 'Active',
            plan: 'Enterprise'
        })
        .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
    }
    console.log('Database profile updated to Admin/Active/Enterprise.');

    // 3. Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { status: 'Active' } }
    );

    if (authError) {
        console.error('Error updating auth metadata:', authError);
        return;
    }
    console.log('Auth user metadata updated successfully.');
    console.log('🎉 Admin activation completed!');
}

createAdmin();
