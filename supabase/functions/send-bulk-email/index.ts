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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("DIAGNOSTIC: Function execution started.");
    
    // Log environment variable status (presence only for security)
    console.log("DIAGNOSTIC: Environment variables check:", {
      SMTP_HOST: !!SMTP_HOST,
      SMTP_PORT: SMTP_PORT,
      SMTP_USER: !!SMTP_USER,
      SMTP_PASS: !!SMTP_PASS,
      SUPABASE_URL: !!SUPABASE_URL,
    });

    const payload: SendBulkEmailPayload = await req.json();
    const { leads, subject, body, html_body, from_name, reply_to, user_id } = payload;

    if (!leads?.length || !subject || !body || !from_name || !user_id) {
      console.warn("DIAGNOSTIC: Missing required fields in payload.");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("DIAGNOSTIC: SMTP credentials missing from environment.");
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create reusable SMTP transporter
    console.log(`DIAGNOSTIC: Initializing transporter with host: ${SMTP_HOST}, port: ${SMTP_PORT}`);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // SSL for 465, TLS/None for 587 or 25
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 15000, // Slightly longer timeout
      greetingTimeout: 10000,
    });
    
    // Verify connection configuration
    try {
      console.log("DIAGNOSTIC: Verifying SMTP connection...");
      await transporter.verify();
      console.log("DIAGNOSTIC: SMTP connection verified successfully.");
    } catch (verifyErr: any) {
      console.error("DIAGNOSTIC: SMTP Verification Failure:", verifyErr);
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
        console.log(`DIAGNOSTIC: Sending email to ${lead.email}`);
        
        const footerText = `\n\n---\nSent by Syed Hassan Gillani | SyntexDev\nsales@syntexdev.com`;
        const footerHtml = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
  <table cellpadding="0" cellspacing="0" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size:14px; color:#222222;">
    <tbody>
      <tr>
        <td style="vertical-align:middle;padding-right:12px;">
          <img src="http://syntexdev.com/wp-content/uploads/2023/12/Gemini_Generated_Image_t2muftt2muftt2mu-removebg-preview.png" alt="SyntexDev" width="200" style="display:block;border:0;outline:none;text-decoration:none;">
        </td>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
            <tbody>
              <tr>
                <td style="font-weight:700; font-size:16px; color:#111111; padding-bottom:3px;">Syed Hassan Gillani</td>
              </tr>
              <tr>
                <td style="color:#666666; padding-bottom:8px;">Co-Founder | SyntexDev</td>
              </tr>
              <tr>
                <td style="padding-bottom:6px;">
                  <span style="color:#111111; font-weight:600;">Email:</span>
                  <a href="mailto:sales@syntexdev.com" style="color:#1a73e8; text-decoration:none;">sales@syntexdev.com</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:6px;">
                  <span style="color:#111111; font-weight:600;">Phone:</span>
                  <a href="tel:+61475709822" style="color:#1a73e8; text-decoration:none;">+61 4757 09822</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:8px;">
                  <span style="color:#111111; font-weight:600;">Web:</span>
                  <a href="https://syntexdev.com" style="color:#1a73e8; text-decoration:none;">syntexdev.com</a>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:10px; font-size:11px; color:#888888; line-height: 1.4;">
          <i>SyntexDev — Web Development · Shopify · Custom SaaS · AI & Automation</i>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:8px; font-size:10px; color:#999999; line-height: 1.4;">
          <small>Disclaimer: This message and any attachments are confidential and intended only for the named recipient.</small>
        </td>
      </tr>
    </tbody>
  </table>
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

        console.log(`DIAGNOSTIC: Successfully sent email to ${lead.email}`);
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
        console.error(`DIAGNOSTIC: Failed to send to ${lead.email}:`, message);
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
    const message = err instanceof Error ? err.message : "Unexpected error during function execution";
    console.error("DIAGNOSTIC: Critical failure:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
