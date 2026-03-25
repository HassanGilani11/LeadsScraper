const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const adminId = '00000000-0000-0000-0000-000000000000'; // Mock UUID
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: adminId,
            email: 'syedhassangilani0@gmail.com',
            full_name: 'Platform Admin',
            role: 'Admin',
            status: 'Active',
            plan: 'Enterprise'
        }, { onConflict: 'id' });
    
    if (error) {
        console.error('Error creating admin:', error);
    } else {
        console.log('Admin created/updated successfully');
    }
}

createAdmin();
