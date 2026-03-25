// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "npm:nodemailer@6.9.7";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const SMTP_FROM_NAME = Deno.env.get("SMTP_FROM_NAME") ?? "Leads Scraper";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRecipient {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
}

interface SendBulkEmailPayload {
  leads: LeadRecipient[];
  subject: string;
  body: string;
  html_body?: string;   // rich HTML from the editor (optional)
  from_name: string;
  reply_to: string;
  user_id: string;
}

function applyMergeTags(template: string, lead: LeadRecipient, senderName?: string): string {
  if (!template) return "";
  
  let result = template;
  const firstName = lead.first_name || lead.email.split("@")[0];
  const lastName = lead.last_name || "";
  const company = lead.company || "your company";
  const email = lead.email;
  const fromName = senderName || "Sender";

  // Define patterns and their replacements
  const replacements: { [key: string]: string } = {
    "first_name": firstName,
    "last_name": lastName,
    "company": company,
    "email": email,
    "client_name": firstName, // Alias
    "your_name": fromName,    // Alias for sender
    "company_name": company,  // Alias
  };

  for (const [key, val] of Object.entries(replacements)) {
    // Matches {{key}}, [[key]], [key], or {{ key }}
    const regex = new RegExp(`(\\{\\{|\\{|\\[|\\[\\[)\\s*${key.replace("_", "[_\\s]?")}\\s*(\\}\\}|\\}|\\]|\\]\\])`, "gi");
    result = result.replace(regex, val);
  }

  // Final catch-all for [Client Name] or [Your Name] with spaces
  result = result
    .replace(/\[Client Name\]/gi, firstName)
    .replace(/\[Your Name\]/gi, fromName)
    .replace(/\[Company Name\]/gi, company);

  return result;
}

function textToHtml(text: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.7; color: #1a1a2e; background:#fff; margin:0; padding:32px; }
    p { margin: 0 0 16px; }
  </style>
</head>
<body>
  ${text.split("\n").map(line => line.trim() ? `<p>${line}</p>` : "<br/>").join("")}
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SendBulkEmailPayload = await req.json();
    const { leads, subject, body, html_body, from_name, reply_to, user_id } = payload;

    if (!leads?.length || !subject || !body || !from_name || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS as Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create reusable SMTP transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });
    
    // Verify connection configuration
    try {
      console.log("Verifying SMTP connection...");
      await transporter.verify();
      console.log("SMTP connection verified successfully.");
    } catch (verifyErr: any) {
      console.error("SMTP Verification Error:", verifyErr);
      return new Response(
        JSON.stringify({ error: `SMTP Connection Failed: ${verifyErr.message || String(verifyErr)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const logRows: object[] = [];

    for (const lead of leads) {
      const displayName = from_name || SMTP_FROM_NAME;
      const personalizedSubject = applyMergeTags(subject, lead, displayName);
      const personalizedBody = applyMergeTags(body, lead, displayName);
      // Use rich HTML from editor if provided, else convert plain text
      const htmlBody = html_body
        ? applyMergeTags(html_body, lead, displayName)
        : textToHtml(personalizedBody);

      try {
        console.log(`Sending email to ${lead.email} with subject: ${personalizedSubject}`);
        
        const footerText = `\n\n---\nSent by ${displayName}\nTo unsubscribe, please reply to this email.`;
        const footerHtml = `<div style="margin-top: 32px; padding-top: 16px; border-t: 1px solid #eee; color: #94a3b8; font-size: 12px;">
          <p>Sent by ${displayName} via Stitch AI Leads Scraper</p>
          <p>To unsubscribe, please reply to this email with "Unsubscribe" in the subject.</p>
        </div>`;

        await transporter.sendMail({
          from: {
            name: displayName,
            address: SMTP_USER,
          },
          to: lead.email,
          replyTo: reply_to || SMTP_USER,
          subject: personalizedSubject,
          text: personalizedBody + footerText,
          html: htmlBody + footerHtml,
          headers: {
            'List-Unsubscribe': `<mailto:${SMTP_USER}?subject=unsubscribe>`,
          }
        });

        console.log(`Successfully sent email to ${lead.email}`);
        sent++;
        logRows.push({
          user_id,
          lead_id: lead.id || null,
          recipient_email: lead.email,
          subject: personalizedSubject,
          body: personalizedBody,
          status: "sent",
        });
      } catch (err: unknown) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${lead.email}: ${message}`);
        logRows.push({
          user_id,
          lead_id: lead.id || null,
          recipient_email: lead.email,
          subject: applyMergeTags(subject, lead),
          body: applyMergeTags(body, lead),
          status: "failed",
          error_message: message,
        });
      }
    }

    // Batch insert logs
    if (logRows.length > 0) {
      await supabase.from("email_logs").insert(logRows);
    }

    return new Response(
      JSON.stringify({ sent, failed, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
