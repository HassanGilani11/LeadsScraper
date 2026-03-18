import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  console.log('--- Checking Leads Table ---');
  const { data: leads, error: leadsError } = await supabase.from('leads').select('id, campaign_id, email').limit(10);
  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
  } else {
    console.log(`Found ${leads?.length || 0} leads (sampled):`);
    console.table(leads);
  }

  console.log('\n--- Checking Campaigns Table ---');
  const { data: campaigns, error: campError } = await supabase.from('campaigns').select('id, name');
  if (campError) {
    console.error('Error fetching campaigns:', campError);
  } else {
    console.log(`Found ${campaigns?.length || 0} campaigns:`);
    console.table(campaigns);
  }

  console.log('\n--- Leads Count per Campaign ---');
  for (const camp of campaigns || []) {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', camp.id);
    console.log(`Campaign "${camp.name}" (${camp.id}): ${count} leads`);
  }

  const { count: nullCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('campaign_id', null);
  console.log(`Leads with NULL campaign_id: ${nullCount}`);
}

checkLeads();
