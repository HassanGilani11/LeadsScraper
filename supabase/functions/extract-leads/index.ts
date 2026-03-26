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
              first_name: { type: SchemaType.STRING, description: "First name" },
              last_name: { type: SchemaType.STRING, description: "Last name" },
              email: { type: SchemaType.STRING, description: "Email address" },
              company: { type: SchemaType.STRING, description: "Company name" },
              job_title: { type: SchemaType.STRING, description: "Lead's job title" },
              phone: { type: SchemaType.STRING, description: "Available phone number" },
              company_website: { type: SchemaType.STRING, description: "Official company website URL" },
              company_size: { type: SchemaType.STRING, description: "Company employee count or size" },
              location: { type: SchemaType.STRING, description: "Primary location (City, State, or Country)" },
              industry: { type: SchemaType.STRING, description: "Industry or sector" },
              icp_score: { type: SchemaType.NUMBER, description: "Relevance score (1-10)" }
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
      2. NAME: Derive First/Last names intelligently. If not explicit, infer from the email prefix.
      3. COMPANY: Determine the company name and website from the content.
      4. ENRICHMENT: You MUST try to find the person's Job Title, Phone, Company Size, and Location. Do not invent data, but use all available clues.
      5. INDUSTRY: Categorize the company (e.g., B2B SaaS, IT Services, Healthcare).
      6. ICP SCORE: Calculate a score from 1 to 10 based on seniority (10: CXO/Owner, 7: Manager, 4: Individual Contributor).
      
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
          job_title: sanitizeField(lead.job_title),
          phone: sanitizeField(lead.phone),
          company_website: sanitizeField(lead.company_website),
          company_size: sanitizeField(lead.company_size),
          location: sanitizeField(lead.location),
          industry: sanitizeField(lead.industry) || 'Technology',
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
