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

// Map plan names to Stripe Price IDs
const PRICE_IDS: Record<string, string> = {
  Pro: Deno.env.get('STRIPE_PRO_PRICE_ID') || '',
  Enterprise: Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || '',
};

// Map plan names to credit limits
const PLAN_CREDITS: Record<string, number> = {
  Pro: 100,
  Enterprise: 500,
};

Deno.serve(async (req: Request) => {
  console.log(`${req.method} request received at ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    const { planName, userId, userEmail } = body;

    if (!planName || !userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: planName, userId, userEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceId = PRICE_IDS[planName];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Invalid plan: ${planName}. Must be 'Pro' or 'Enterprise'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create or reuse Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create Stripe Checkout Session
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    console.log(`Creating session for user ${userId} (${userEmail}) for plan ${planName}...`);
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId, // CRITICAL: Standard field for tracking user back to your system
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: userId,
        plan_name: planName,
        plan_credits: String(PLAN_CREDITS[planName]),
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_name: planName,
        },
      },
    });

    console.log(`✅ Session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Stripe checkout error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
