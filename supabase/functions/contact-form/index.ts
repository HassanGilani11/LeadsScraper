import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "npm:nodemailer@6.9.7";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const SMTP_FROM_NAME = Deno.env.get("SMTP_FROM_NAME") ?? "SyntexDev Support";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormPayload {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fullName, email, subject, message }: ContactFormPayload = await req.json();

    if (!fullName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with Service Role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Save to Database
    const { error: dbError } = await supabase
      .from("contact_enquiries")
      .insert([
        {
          full_name: fullName,
          email: email,
          subject: subject,
          message: message,
        },
      ]);

    if (dbError) {
      console.error("Database Insert Error:", dbError);
      // We continue to send the email even if DB insert fails, but log it.
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS as Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions = {
      from: {
        name: SMTP_FROM_NAME,
        address: SMTP_USER,
      },
      to: SMTP_USER, // Send to the admin (same as SMTP_USER typically)
      replyTo: email,
      subject: `New Contact Form Submission: ${subject}`,
      text: `
        New Message from Leads Scraper Contact Form:
        
        Name: ${fullName}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
      `,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1b57b1; margin-top: 0;">New Contact Submission</h2>
          <p style="margin-bottom: 20px; color: #64748b;">You have received a new message from the Leads Scraper contact form.</p>
          
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px;"><strong>From:</strong> ${fullName} (${email})</p>
            <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="white-space: pre-wrap; line-height: 1.6; color: #334155; padding: 16px; border-left: 4px solid #1b57b1;">
            ${message}
          </div>
          
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <table cellpadding="0" cellspacing="0" style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size:14px; color:#222222; width: 100%;">
            <tbody>
              <tr>
                <td style="vertical-align:middle;padding-right:12px; width: 210px;">
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
                          <span style="color:#111111; font-weight:600;">Web:</span>
                          <a href="https://syntexdev.com" style="color:#1a73e8; text-decoration:none;">syntexdev.com</a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            This email was sent from the SyntexDev contact form engine.
          </div>
        </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Contact Form Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
