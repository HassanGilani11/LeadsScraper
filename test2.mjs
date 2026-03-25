import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Invoking function...');
  const { data, error } = await supabase.functions.invoke('extract-leads', {
    body: {
      url: 'https://tiptap.dev/',
      textContent: 'Analyze website: https://tiptap.dev/',
      campaignId: null,
      userId: '784ce1f3-c9cf-43ba-bfc7-0b13ba812e96' // Need a valid UUID so it doesn't fail DB insert
    }
  });

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
