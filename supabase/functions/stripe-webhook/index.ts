import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Map plan to max_credits
const PLAN_MAX_CREDITS: Record<string, number> = {
  Starter: 20,
  Pro: 100,
  Enterprise: 500,
};

// Map Stripe Price IDs to plan names (fallback if metadata is missing)
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRO_PRICE_ID') || '']: 'Pro',
  [Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || '']: 'Enterprise',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('Missing stripe-signature header');
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('⚠️ Webhook signature verification failed:', message);
    console.error('📌 Make sure STRIPE_WEBHOOK_SECRET matches the Signing secret in your Stripe Dashboard webhook destination.');
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log(`✅ Processing Stripe event: ${event.type} (id: ${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Processing checkout.session.completed for ${session.id}...`);

        let userId = session.metadata?.supabase_user_id 
          || session.client_reference_id 
          || undefined;
        let planName = session.metadata?.plan_name;

        // If metadata is missing, fetch the full session with line_items
        if (!userId || !planName) {
          console.log(`⚠️ Metadata missing (userId: ${userId}, plan: ${planName}), fetching full session...`);
          try {
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items'],
            });
            userId = fullSession.metadata?.supabase_user_id || fullSession.client_reference_id || undefined;
            planName = fullSession.metadata?.plan_name;

            // If still no planName, lookup from price ID
            if (!planName && fullSession.line_items?.data?.[0]?.price?.id) {
              const priceId = fullSession.line_items.data[0].price.id;
              planName = PRICE_TO_PLAN[priceId];
              console.log(`Fallback: looked up plan name "${planName}" from price ID ${priceId}`);
            }
          } catch (fetchErr) {
            console.error('❌ Failed to fetch session details from Stripe:', fetchErr);
          }
        }

        if (!userId) {
          console.error('❌ Could not determine user ID from session metadata or client_reference_id:', session.id);
          break;
        }

        if (!planName) {
          console.error('❌ Could not determine plan name for session:', session.id);
          console.log('Session info for debugging:', JSON.stringify({ 
            id: session.id,
            metadata: session.metadata, 
            price_ids: session.line_items?.data.map((i: any) => i.price?.id)
          }));
          break;
        }

        const maxCredits = PLAN_MAX_CREDITS[planName] || 20;
        const now = new Date().toISOString();
        const subscriptionId = session.subscription;

        console.log(`🔄 Upgrading user ${userId} → ${planName} (${maxCredits} credits)`);

        // Update the user's profile
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: planName,
            max_credits: maxCredits,
            credits: 0,
            last_reset_date: now,
            ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
          })
          .eq('id', userId);

        if (error) {
          console.error('❌ Error updating profile:', error);
        } else {
          console.log(`✅ Successfully upgraded user ${userId} to ${planName} (${maxCredits} credits)`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by stripe_customer_id
          const customerId = typeof subscription.customer === 'string' 
            ? subscription.customer : subscription.customer?.id;
          
          if (customerId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .single();
            
            if (profile?.id) {
              await supabase
                .from('profiles')
                .update({ plan: 'Starter', max_credits: 20, credits: 0, last_reset_date: new Date().toISOString(), stripe_subscription_id: null })
                .eq('id', profile.id);
              console.log(`⬇️ Downgraded user ${profile.id} to Starter (found via customer ID)`);
            }
          } else {
            console.error('❌ Missing supabase_user_id and customer ID in subscription metadata');
          }
          break;
        }

        const { error } = await supabase
          .from('profiles')
          .update({ plan: 'Starter', max_credits: 20, credits: 0, last_reset_date: new Date().toISOString(), stripe_subscription_id: null })
          .eq('id', userId);

        if (error) {
          console.error('❌ Error downgrading profile:', error);
        } else {
          console.log(`⬇️ Downgraded user ${userId} to Starter`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Handler error';
    console.error('❌ Event handler error:', message);
    return new Response(message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
