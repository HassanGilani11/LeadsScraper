const url = 'https://cbvcgofjytbmjwebygkc.supabase.co/functions/v1/extract-leads';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidmNnb2ZqeXRibWp3ZWJ5Z2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTU3MTcsImV4cCI6MjA4OTI3MTcxN30.bz40cohjdayMhTtt-kjcUOY6006LwdSeNmlu6Z-6L94';

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
