import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user with email_confirm: true (so they don't get the Supabase verification email)
    // and set metadata so the trigger can pick it up.
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        status: 'Pending Approval' // Hint for the trigger or future logic
      }
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Explicitly update the profile status just in case the trigger default isn't enough
    if (userData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ status: 'Pending Approval', full_name: fullName })
        .eq('id', userData.user.id);
        
      // Optional: Send "Registration Received" email via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'SyntexDev <onboarding@resend.dev>', // Should be a verified domain in production
              to: email,
              subject: 'Registration Received - Pending Approval',
              html: `<h1>Welcome, ${fullName}!</h1><p>Your registration for the Leads Scraper platform has been received and is currently pending administrator approval. You will receive another email once your account has been activated.</p>`,
            }),
          });
        } catch (e) {
          console.error("Failed to send welcome email:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user: userData.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("PUBLIC_SIGNUP_ERROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Returning 200 with error object for easier frontend handling
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
