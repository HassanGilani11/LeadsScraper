const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLeadSource() {
    const { data, error } = await supabase
        .from('leads')
        .update({ source: 'csv' })
        .eq('email', 'john.doe@example.com');
    
    if (error) {
        console.error('Error fixing lead source:', error);
    } else {
        console.log('Lead source fixed successfully');
    }
}

fixLeadSource();
