// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import nodemailer from "npm:nodemailer@6.9.7";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const SMTP_FROM_NAME = Deno.env.get("SMTP_FROM_NAME") ?? "Syed Hassan Gillani | SyntexDev";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reusing helper functions from send-bulk-email
function applyMergeTags(template: string, lead: any, senderName?: string): string {
  if (!template) return "";
  let result = template;
  const firstName = lead.first_name || lead.email.split("@")[0];
  const lastName = lead.last_name || "";
  const company = lead.company || "your company";
  const fromName = senderName || "Sender";

  const replacements: { [key: string]: string } = {
    "first_name": firstName,
    "last_name": lastName,
    "company": company,
    "email": lead.email,
    "client_name": firstName,
    "your_name": fromName,
    "company_name": company,
  };

  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`(\\{\\{|\\{|\\[|\\[\\[)\\s*${key.replace("_", "[_\\s]?")}\\s*(\\}\\}|\\}|\\]|\\]\\])`, "gi");
    result = result.replace(regex, val);
  }
  
  result = result
    .replace(/\[Client Name\]/gi, firstName)
    .replace(/\[Your Name\]/gi, fromName)
    .replace(/\[Company Name\]/gi, company);

  return result;
}

function textToHtml(text: string): string {
  return `<!DOCTYPE html><html><body style="font-family: sans-serif; line-height: 1.6; color: #333; padding: 20px;">
    ${text.split("\n").map(l => l.trim() ? `<p>${l}</p>` : "<br/>").join("")}
  </body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // 1. Find leads due for next step
    const { data: dueSequences, error: seqError } = await supabase
      .from('lead_sequences')
      .select(`
        *,
        leads (*),
        campaigns (id, name, user_id)
      `)
      .eq('status', 'active')
      .lte('next_send_at', new Date().toISOString());

    if (seqError) throw seqError;
    if (!dueSequences || dueSequences.length === 0) {
      return new Response(JSON.stringify({ message: "No sequences due for processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Processing ${dueSequences.length} due sequences...`);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    let processedCount = 0;
    const errors = [];

    for (const seq of dueSequences) {
      const { leads: lead, campaign_id, current_step_number, user_id } = seq;
      const nextStepNum = current_step_number + 1;

      // 2. Fetch the next step
      const { data: step, error: stepError } = await supabase
        .from('campaign_steps')
        .select('*')
        .eq('campaign_id', campaign_id)
        .eq('step_number', nextStepNum)
        .single();

      if (stepError || !step) {
        // No more steps or error fetching step - mark sequence as completed
        await supabase.from('lead_sequences').update({ status: 'completed' }).eq('id', seq.id);
        continue;
      }

      // 3. Send Email
      const fromName = SMTP_FROM_NAME;
      const subject = applyMergeTags(step.subject, lead, fromName);
      const htmlBody = applyMergeTags(step.body_html, lead, fromName);

      try {
        await transporter.sendMail({
          from: { name: fromName, address: SMTP_USER },
          to: lead.email,
          subject: subject,
          html: htmlBody,
          headers: { 'List-Unsubscribe': `<mailto:${SMTP_USER}?subject=unsubscribe>` }
        });

        // 4. Schedule next step
        const { data: followingStep } = await supabase
          .from('campaign_steps')
          .select('delay_days')
          .eq('campaign_id', campaign_id)
          .eq('step_number', nextStepNum + 1)
          .single();

        let nextStatus = 'active';
        let nextSendAt = null;

        if (followingStep) {
          const delay = followingStep.delay_days || 0;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + delay);
          nextSendAt = nextDate.toISOString();
        } else {
          nextStatus = 'completed';
        }

        await supabase
          .from('lead_sequences')
          .update({
            current_step_number: nextStepNum,
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt,
            status: nextStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', seq.id);

        // Log to email_logs
        await supabase.from('email_logs').insert({
          user_id: user_id,
          lead_id: lead.id,
          recipient_email: lead.email,
          subject: subject,
          body: step.body_html, // Simplified for log
          status: 'sent'
        });

        processedCount++;
      } catch (sendErr) {
        console.error(`Failed to send seq ${seq.id} to ${lead.email}:`, sendErr);
        errors.push(`${lead.email}: ${sendErr.message}`);
      }
    }

    return new Response(JSON.stringify({ processed: processedCount, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Critical Sequence Engine Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
