import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('ADMIN_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
       console.error("DIAGNOSTIC_LOG: Critical - Missing Service Role Key (ADMIN_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY) or URL");
       throw new Error("Edge Function configuration error: Missing secrets.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn("DIAGNOSTIC_LOG: No Authorization header provided");
      return new Response(JSON.stringify({ error: 'Auth header missing' }), {
        status: 200, // Returning 200 to allow frontend to handle predictably
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    // 2. Manual JWT verification
    const { data: { user: sender }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !sender) {
      console.error("DIAGNOSTIC_LOG: JWT Verification failed:", authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Admin Check
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', sender.id)
      .single();

    if (profile?.role?.toLowerCase() !== 'admin') {
      console.warn("DIAGNOSTIC_LOG: Unauthorized access attempt by:", sender.email);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Process Action
    const body = await req.json();
    const { type, email, fullName, plan, password, status, userId, role } = body;
    console.log(`DIAGNOSTIC_LOG: Action ${type} for user ${userId || email}`);

    if (type === 'delete-user') {
      // Robust multi-step deletion
      console.log("DIAGNOSTIC_LOG: Starting robust deletion data wipe...");
      
      const { data: targetProfile } = await supabaseAdmin.from('profiles').select('user_id').eq('id', userId).single();
      const authId = targetProfile?.user_id || userId;

      // Sequential manual cleanup (ensures all FKs are cleared even if cascade fails)
      await supabaseAdmin.from('lead_audits').delete().eq('user_id', authId);
      await supabaseAdmin.from('leads').delete().eq('user_id', authId);
      await supabaseAdmin.from('campaigns').delete().eq('user_id', authId);
      await supabaseAdmin.from('subscription_events').delete().eq('user_id', authId);
      await supabaseAdmin.from('email_logs').delete().eq('user_id', authId);
      await supabaseAdmin.from('profiles').delete().eq('id', userId);

      // Final Auth deletion
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authId);
      
      if (deleteError && !deleteError.message?.includes('User not found')) {
         throw deleteError;
      }

      return new Response(JSON.stringify({ success: true, message: 'User wiped successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'create') {
      if (!email) throw new Error("Email is required for creation");

      let authUser;
      if (password) {
        console.log("DIAGNOSTIC_LOG: Creating user with password...");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        });
        if (error) throw error;
        authUser = data.user;
      } else {
        console.log("DIAGNOSTIC_LOG: Inviting user by email...");
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${req.headers.get('origin') || ''}/auth/callback`
        });
        if (error) throw error;
        authUser = data.user;
      }

      if (authUser) {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.id,
            user_id: authUser.id,
            email: email,
            full_name: fullName,
            role: role || 'Member',
            plan: plan || 'Starter',
            status: status || 'Active'
          });
      }

      return new Response(JSON.stringify({ success: true, user: authUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'approve') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'Active' })
        .eq('id', userId);

      if (updateError) throw updateError;
      console.log("DIAGNOSTIC_LOG: Approved Successfully:", userId);

      return new Response(JSON.stringify({ success: true, message: 'User approved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action not fully implemented in this diagnostic update' }), {
       status: 200,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("DIAGNOSTIC_LOG: System error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
