import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify requester is a valid user
    const { data: { user: sender }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !sender) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify requester is an Admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', sender.id)
      .single();

    if (profile?.role !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Process the action
    const { type, email, fullName, plan, status, userId } = await req.json();

    if (type === 'create') {
      if (!email) throw new Error("Email is required for invitation");
      
      // Create user and send invite
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: `${req.headers.get('origin') || ''}/reset-password`
      });

      if (inviteError) throw inviteError;

      // Upsert profile (trigger fallback)
      if (inviteData.user) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: inviteData.user.id,
            user_id: inviteData.user.id,
            email: email,
            full_name: fullName,
            plan: plan || 'Starter',
            status: status || 'Pending'
          });
        
        if (profileError) console.error("Profile upsert error:", profileError);
      }

      return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'reset-password') {
      if (!userId) throw new Error("User ID is required for password reset");
      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userAuth.user) throw new Error("User not found");

      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userAuth.user.email,
        redirectTo: `${req.headers.get('origin') || ''}/reset-password`
      });

      if (resetError) throw resetError;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'delete-user') {
      if (!userId) throw new Error("User ID is required for deletion");
      if (userId === sender.id) throw new Error("Cannot delete yourself");
      
      // Attempt to delete from Auth (might fail if they were already deleted via Dashboard)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError && !deleteError.message.includes("User not found")) {
         throw deleteError;
      }

      // Manually clean up the profiles table just in case the Cascade didn't fire
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (profileDeleteError) throw profileDeleteError;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("EDGE_FUNCTION_ERROR:", err.message);
    // Returning 200 with an error object ensures the client SDK doesn't swallow the message in a generic FunctionsHttpError
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
