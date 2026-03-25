
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  console.log('Sending request to', SUPABASE_URL);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: 'https://tiptap.dev/',
        textContent: 'Analyze website: https://tiptap.dev/',
        campaignId: null,
        userId: '784ce1f3-c9cf-43ba-bfc7-0b13ba812e96'
      })
    });
    
    const text = await res.text();
    const fs = await import('fs');
    fs.writeFileSync('out.json', text);
    console.log('Status:', res.status);
    console.log('Response saved to out.json');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
