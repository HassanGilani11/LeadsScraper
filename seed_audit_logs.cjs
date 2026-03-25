const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const actionTypes = [
    'USER_BANNED', 'USER_UNBANNED', 'PLAN_CHANGED', 'PLAN_UPGRADED', 
    'IMPERSONATION_START', 'SETTING_UPDATED', 'CREDITS_ADDED', 'USER_INVITED',
    'FEATURE_FLAG_TOGGLED', 'CAMPAIGN_DELETED'
];

const ips = ['208.127.178.75', '35.196.219.43', '237.67.173.220', '34.86.237.244', '158.86.58.152', '127.134.154.2'];
const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function seed() {
    console.log('Seeding detailed audit logs...');
    
    // Get an admin ID (if none exists, use a mock UUID for now, but RLS might block it)
    const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'Admin')
        .limit(1);

    const adminId = admins?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const logs = [];

    for (let i = 0; i < 50; i++) {
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        const targetEntity = i % 3 === 0 ? `user_${i}@example.com` : i % 3 === 1 ? 'maintenance_mode' : 'beta_rollout';
        
        let beforeValue = null;
        let afterValue = null;
        let note = '';
        let category = 'system';

        if (actionType === 'PLAN_CHANGED' || actionType === 'PLAN_UPGRADED') {
            beforeValue = { plan: 'Starter' };
            afterValue = { plan: 'Pro' };
            note = 'User requested upgrade via billing dashboard';
            category = 'billing';
        } else if (actionType === 'FEATURE_FLAG_TOGGLED') {
            beforeValue = false;
            afterValue = true;
            note = 'Beta rollout to Pro users';
            category = 'settings';
        } else if (actionType === 'USER_BANNED') {
            beforeValue = { status: 'Active' };
            afterValue = { status: 'Banned' };
            note = 'Violation of Terms of Service (Spamming)';
            category = 'moderation';
        } else if (actionType === 'SETTING_UPDATED') {
            beforeValue = 'v1.0.0';
            afterValue = 'v1.1.0';
            note = 'Manual system version update';
            category = 'system';
        }

        logs.push({
            admin_id: adminId === '00000000-0000-0000-0000-000000000000' ? null : adminId,
            action_type: actionType,
            target_entity: targetEntity,
            before_value: beforeValue,
            after_value: afterValue,
            ip_address: ips[Math.floor(Math.random() * ips.length)],
            note: note,
            metadata: {
                category: category,
                user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
                environment: 'production'
            },
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    const { error: insertError } = await supabase
        .from('audit_logs')
        .insert(logs);

    if (insertError) {
        console.error('Error inserting logs:', insertError);
    } else {
        console.log('Successfully seeded 50 detailed audit logs');
    }
}

seed();
