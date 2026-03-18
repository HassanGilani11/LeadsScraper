import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRO_PRICE_ID') || '']: 'Pro',
  [Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || '']: 'Enterprise',
};

const PLAN_CREDITS: Record<string, number> = {
  Pro: 100,
  Enterprise: 500,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the real session from Stripe to verify it's actually paid
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    // Only proceed if payment actually succeeded
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', status: session.payment_status }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session belongs to this user
    const sessionUserId = session.metadata?.supabase_user_id || session.client_reference_id;
    if (sessionUserId && sessionUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Session does not belong to this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine plan from metadata or price ID
    let planName = session.metadata?.plan_name;
    if (!planName && session.line_items?.data?.[0]?.price?.id) {
      planName = PRICE_TO_PLAN[session.line_items.data[0].price.id];
    }

    if (!planName) {
      return new Response(
        JSON.stringify({ error: 'Could not determine plan from session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxCredits = PLAN_CREDITS[planName] || 20;
    const now = new Date().toISOString();
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    console.log(`Updating profile for user ${userId} to plan ${planName} (${maxCredits} credits)...`);

    // Update the user's profile in Supabase
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: planName,
        max_credits: maxCredits,
        credits: 0, // Reset credits to 0 (used 0)
        last_reset_date: now,
        ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ DB update error for user ${userId}:`, updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update profile in database', 
          details: updateError.message,
          userId: userId,
          plan: planName
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Plan SUCCESSFULY verified and activated: user=${userId} plan=${planName} credits=${maxCredits}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Plan upgraded successfully',
        plan: planName, 
        max_credits: maxCredits, 
        profile 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('verify-payment error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
