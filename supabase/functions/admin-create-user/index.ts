import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req: Request) => {
  console.log("DIAGNOSTIC_LOG: Function started", req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const authHeader = req.headers.get('Authorization');
    console.log("DIAGNOSTIC_LOG: Auth Header present:", !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify requester is a valid user
    const { data: { user: sender }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !sender) {
      console.error("DIAGNOSTIC_LOG: Auth Error:", authError?.message);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: Invalid token', 
        details: authError?.message 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("DIAGNOSTIC_LOG: Sender:", sender.email);

    // 2. Verify requester is an Admin
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', sender.id)
      .single();

    if (profileError || !profile) {
       console.error("DIAGNOSTIC_LOG: Profile Error:", profileError);
    }

    // Relaxed case-insensitive role check
    const userRole = (profile?.role || '').toLowerCase();
    console.log("DIAGNOSTIC_LOG: User Role:", userRole);

    if (userRole !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Admin access required', 
        currentRole: profile?.role 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Process the action
    const body = await req.json();
    const { type, email, fullName, plan, password, status, userId } = body;
    console.log("DIAGNOSTIC_LOG: Action Type:", type);

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
            role: 'User',
            plan: plan || 'starter',
            status: status || 'Pending Approval'
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

    if (type === 'delete-user') {
      console.log("DIAGNOSTIC_LOG: Deleting user:", userId);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        console.warn("DIAGNOSTIC_LOG: Delete Error:", deleteError);
        // Manual cleanup if cascade fails
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        throw new Error(`Delete failed: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({ success: true, message: 'User deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action type', type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("DIAGNOSTIC_LOG: Final Catch:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
