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
      Extract their first name, last name, email address, company name, and industry if available.
      
      For each lead, calculate an "icp_score" from 1 to 10:
      - 10: High-level decision maker (CEO, Founder, VP) in a relevant industry.
      - 7-9: Mid-management or specialized role in a relevant industry.
      - 4-6: Individual contributor or general contact in a relevant industry.
      - 1-3: Generic contact or low relevance role/industry.
      
      Only include entries that have at least an email address.
      
      Important: If you cannot find a specific person's name, leave first_name and last_name blank. Do NOT put the company name or generic titles into the first_name or last_name fields.
      
      Content to analyze:
      ${contentToAnalyze}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonString = response.text();
    const leads = JSON.parse(jsonString);

    if (leads && leads.length > 0) {
      const leadsToInsert = leads.map((lead: any) => ({
        campaign_id: campaignId || null,
        user_id: userId,
        email: lead.email,
        first_name: lead.first_name || null,
        last_name: lead.last_name || null,
        company: lead.company || null,
        industry: lead.industry || 'Other',
        icp_score: lead.icp_score || 0,
        source_url: url || null,
        status: 'new',
        source: 'scraper'
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error('Supabase Error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save leads to database.', 
            details: error,
            leads: leads 
          }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
