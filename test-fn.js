import 'dotenv/config';

const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/extract-leads`;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://example.com',
      textContent: 'Contact: hello@example.com. CEO: Jane Doe.',
      campaignId: 'c277ea2f-0f62-4304-9db0-f57930113c41',
      userId: 'd168fb98-1e43-4c90-bcd0-a92c4d6da201'
    })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
test();
