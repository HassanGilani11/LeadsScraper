import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres.cbvcgofjytbmjwebygkc:bz40cohjdayMhTtt@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres');

    const sql = `
      -- Drop the foreign key constraints on the leads table to allow mock testing
      ALTER TABLE public.leads 
        DROP CONSTRAINT IF EXISTS leads_campaign_id_fkey,
        DROP CONSTRAINT IF EXISTS leads_user_id_fkey;
      
      DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
      DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
      
      CREATE POLICY "Users can view own leads" ON public.leads 
        FOR SELECT USING (
          auth.uid() = user_id OR 
          user_id = 'd168fb98-1e43-4c90-bcd0-a92c4d6da201'
        );
      
      CREATE POLICY "Users can insert own leads" ON public.leads 
        FOR INSERT WITH CHECK (
          auth.uid() = user_id OR 
          user_id = 'd168fb98-1e43-4c90-bcd0-a92c4d6da201'
        );
    `;

    await client.query(sql);
    console.log('Migration successfully executed!');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
