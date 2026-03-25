import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { url, textContent, campaignId, userId } = await req.json();

    if (!textContent && !url) {
      return new Response('Must provide textContent or url', { status: 400, headers: corsHeaders });
    }

    if (!userId) {
       return new Response('Must provide userId', { status: 400, headers: corsHeaders });
    }

    const contentToAnalyze = textContent || `Analyze website: ${url}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          description: "List of extracted leads",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              first_name: { type: SchemaType.STRING, description: "First name of the lead" },
              last_name: { type: SchemaType.STRING, description: "Last name of the lead" },
              email: { type: SchemaType.STRING, description: "Email address, must be a valid email format" },
              company: { type: SchemaType.STRING, description: "Company name" },
              industry: { type: SchemaType.STRING, description: "Industry or sector of the lead/company (e.g., SaaS, Finance, Healthcare)" },
              icp_score: { type: SchemaType.NUMBER, description: "Ideal Customer Profile score from 1 to 10 based on relevance to B2B SaaS sales" }
            },
            required: ["email", "icp_score"]
          }
        }
      }
    });

    const prompt = `
      You are an expert lead extraction assistant.
      Your goal is to find all professional contacts, decision-makers, and relevant leads from the provided text content.
      
      Follow these strict rules for extraction:
      1. EMAIL: Extract every valid email address found.
      2. NAME: If you cannot find a specific person's name, do NOT leave it blank and do NOT use literal strings like "NULL" or "EMPTY". Instead, derive a friendly placeholder from the email prefix (e.g., for "support@company.com", set First Name: "Support", Last Name: "Team"). For "john.doe@company.com" where the name isn't explicit in text, infer First: "John", Last: "Doe". 
      3. COMPANY: Determine the company name from the website content or domain. Apply this company name to all extracted leads if they belong to it.
      4. INDUSTRY: You MUST determine the exact industry or sector (e.g., B2B SaaS, IT Services, Healthcare, Real Estate) based on the website content. Provide your best intelligent guess. Do NOT use "Unknown", "NULL", or leave it blank. Apply this industry to ALL extracted leads.
      5. ICP SCORE: Calculate an "icp_score" from 1 to 10 based on relevance (10: Executive/Decision Maker, 7-9: Mid-management, 4-6: Contributor, 1-3: Generic contact).
      
      Only include entries that have at least an email address.
      
      Content to analyze:
      ${contentToAnalyze}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonString = response.text();
    const leads = JSON.parse(jsonString);

    if (leads && leads.length > 0) {
      const sanitizeField = (val: any) => {
        if (!val || typeof val !== 'string') return null;
        const lower = val.trim().toLowerCase();
        if (lower === 'null' || lower === 'empty' || lower === 'unknown') return null;
        return val.trim();
      };
      
      const getFallbackName = (email: string, isLastName: boolean) => {
        const prefix = email.split('@')[0];
        if (isLastName) return 'Team';
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      };

      const leadsToInsert = leads.map((lead: any) => {
        const email = lead.email || '';
        const fName = sanitizeField(lead.first_name);
        const lName = sanitizeField(lead.last_name);
        
        return {
          campaign_id: campaignId || null,
          user_id: userId,
          email: email,
          first_name: fName || getFallbackName(email, false),
          last_name: lName || getFallbackName(email, true),
          company: sanitizeField(lead.company) || 'Unknown Company',
          industry: sanitizeField(lead.industry) || 'Technology', // Fallback to a common industry if all else fails
          icp_score: lead.icp_score || 1,
          source_url: url || null,
          status: 'new',
          source: 'scraper'
        };
      });

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error('Supabase Error:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to save leads to database.', 
            details: error,
            leads: leads 
          }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Extracted and saved ${leads.length} leads`,
          leads: data 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'No leads found', leads: [] }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Extraction Error:', error);
    
    let userFriendlyError = 'An unexpected error occurred during extraction.';
    if (error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('overloaded')) {
      userFriendlyError = 'The AI service is currently experiencing high demand. Please try again in a few minutes.';
    } else if (error.message) {
      userFriendlyError = error.message;
    }

    return new Response(
      JSON.stringify({ success: false, error: userFriendlyError, message: error.message }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
