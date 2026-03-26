import { GoogleGenerativeAI, SchemaType } from "https://esm.sh/@google/generative-ai@0.24.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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


// Common technology signatures for detection
const techSignatures = {
  'WordPress': [/wp-content|wp-includes/i, /<meta name="generator" content="WordPress/i],
  'Shopify': [/cdn\.shopify\.com/i, /shopify\.js/i, /Shopify\.shop/i],
  'Webflow': [/webflow\.js/i, /data-wf-page/i, /webflow\.com/i],
  'Squarespace': [/squarespace\.com/i, /static1\.squarespace\.com/i],
  'Wix': [/wixstatic\.com/i, /_wix/i],
  'HubSpot': [/js\.hs-scripts\.com/i, /hubspot\.com/i, /HubSpotAnalytics/i],
  'React': [/_next\/static/i, /react\.production/i, /__REACT_DEVTOOLS/i, /ds-react/i],
  'Next.js': [/_next\/static/i, /__NEXT_DATA__/i, /_next\/data/i],
  'Vercel': [/vercel\.app/i, /vercel\.com/i, /_vercel/i],
  'Vue.js': [/vue\.production/i, /nuxt/i, /__VUE__/i],
  'Tailwind CSS': [/tailwind/i, /TW-ELEMENTS/i],
  'Bootstrap': [/bootstrap\.min\.css/i, /bootstrap\.bundle/i],
  'Google Analytics': [/gtag/i, /google-analytics\.com\/analytics/i, /UA-/],
  'Facebook Pixel': [/fbevents\.js/i, /connect\.facebook\.net/i],
  'Hotjar': [/static\.hotjar\.com/i, /hj\.js/i],
  'Intercom': [/intercom\.io/i, /intercomcdn\.com/i],
  'WooCommerce': [/woocommerce/i, /wc-ajax/i],
  'Magento': [/magento/i, /static\/_cache/i],
  'BigCommerce': [/bigcommerce/i, /bc-app/i],
  'Salesforce': [/salesforce\.com/i, /force\.com/i],
  'GraphQL': [/graphql/i, /gql/i, /__typename/i],
  'Apollo': [/apollo-client/i, /apollo/i],
  'Sentry': [/sentry\.io/i, /sentry/i],
  'Segment': [/segment\.com/i, /segment\.js/i, /analytics\.js/i],
  'Contentful': [/contentful\.com/i, /ctfassets\.net/i],
  'Prismic': [/prismic\.io/i, /prismic/i],
  'Strapi': [/strapi/i],
  'Sanity': [/sanity\.io/i, /cdn\.sanity\.io/i],
  'Cloudflare': [/cloudflare\.com/i, /cdn-cgi/i],
  'Typeform': [/typeform\.com/i, /embed\.typeform/i],
  'ActiveCampaign': [/activecampaign\.com/i],
  'Mailchimp': [/chimpstatic\.com/i, /mailchimp/i],
  'Zendesk': [/zendesk\.com/i, /zopim/i]
};

function detectTechStack(html: string): string[] {
  const detected: string[] = [];
  for (const [tech, patterns] of Object.entries(techSignatures)) {
    if (patterns.some(p => p.test(html))) {
      detected.push(tech);
    }
  }
  return detected;
}

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

    let contentToAnalyze = textContent || "";
    
    if (url && (!textContent || textContent.includes("Analyze website:"))) {
      try {
        console.log(`Fetching content for: ${url}`);
        const fetchUrl = url.startsWith('http') ? url : `https://${url}`;
        const res = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.google.com/'
          }
        });
        
        if (res.ok) {
          const html = await res.text();
          // Extract text and basic tags to reduce tokens while keeping structure
          // Extract links (href and src) first
          const urls: string[] = [];
          const baseUrl = new URL(fetchUrl);
          
          const hrefMatches = html.matchAll(/href=["']([^"']+)["']/gi);
          const srcMatches = html.matchAll(/src=["']([^"']+)["']/gi);
          
          const processUrl = (u: string) => {
            if (u.startsWith('//')) return `https:${u}`;
            if (u.startsWith('/')) return `${baseUrl.origin}${u}`;
            return u;
          };

          for (const match of hrefMatches) urls.push(processUrl(match[1]));
          for (const match of srcMatches) urls.push(processUrl(match[1]));
          
          const uniqueUrls = [...new Set(urls)].filter(u => u.startsWith('http')).join('\n');

          // Extract Meta Tags
          const metaTitleMatch = html.match(/<title[^>]*>([\s\S]*)<\/title>/i);
          const metaTitle = metaTitleMatch ? metaTitleMatch[1] : "";
          const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const metaDesc = metaDescMatch ? metaDescMatch[1] : "";

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : html;
          
          // Detect Tech Stack from raw HTML
          const detectedTech = detectTechStack(html);
          const metaGeneratorMatch = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
          const metaGenerator = metaGeneratorMatch ? metaGeneratorMatch[1] : "";
          if (metaGenerator && !detectedTech.includes(metaGenerator)) detectedTech.push(metaGenerator);
          
          const cleanText = bodyContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
          contentToAnalyze = `
Meta Data:
Title: ${metaTitle}
Description: ${metaDesc}
Generator: ${metaGenerator}

Detected Technology Signatures:
${detectedTech.join(', ')}

Links & Media Found (Samples):
${uniqueUrls.substring(0, 5000)}

Visible Text Fragment:
${cleanText.substring(0, 20000)}
          `.substring(0, 30000); // Limit to 30k chars for token safety
          
          console.log(`Successfully fetched ${contentToAnalyze.length} chars for AI analysis.`);
        } else {
          console.warn(`Fetch failed with status: ${res.status}`);
          contentToAnalyze = textContent || `Analyze website: ${url}`;
        }
      } catch (e: any) {
        console.error("Fetch error:", e.message);
        contentToAnalyze = textContent || `Analyze website: ${url}`;
      }
    }

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
              icp_score: { type: SchemaType.NUMBER, description: "Relevance score (1-10)" },
              facebook_url: { type: SchemaType.STRING, description: "Facebook page URL" },
              twitter_url: { type: SchemaType.STRING, description: "Twitter/X profile URL" },
              instagram_url: { type: SchemaType.STRING, description: "Instagram profile URL" },
              linkedin_url_person: { type: SchemaType.STRING, description: "Lead's personal LinkedIn URL" },
              youtube_url: { type: SchemaType.STRING, description: "YouTube channel URL" },
              pinterest_url: { type: SchemaType.STRING, description: "Pinterest profile URL" },
              snapchat: { type: SchemaType.STRING, description: "Snapchat handle or link" },
              whatsapp: { type: SchemaType.STRING, description: "WhatsApp contact number or link" },
              tiktok: { type: SchemaType.STRING, description: "TikTok profile URL" },
              telegram: { type: SchemaType.STRING, description: "Telegram handle or link" },
              skype: { type: SchemaType.STRING, description: "Skype ID or handle" },
              contact_page_url: { type: SchemaType.STRING, description: "Direct link to contact page" },
              about_page_url: { type: SchemaType.STRING, description: "Direct link to about us page" },
              logo_url: { type: SchemaType.STRING, description: "Website logo URL" },
              business_description: { type: SchemaType.STRING, description: "Short summary of what the business does" },
              founded_year: { type: SchemaType.STRING, description: "Year the company was started" },
              technographics: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING }, 
                description: "Technologies used (CMS, CRM, Analytics, Frameworks)" 
              },
              meta_title: { type: SchemaType.STRING, description: "SEO Page Title" },
              meta_description: { type: SchemaType.STRING, description: "SEO Page Description" },
              primary_keywords: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING }, 
                description: "Main keywords related to business" 
              },
              website_language: { type: SchemaType.STRING, description: "Primary language of the website" },
              career_page_url: { type: SchemaType.STRING, description: "Link to careers/jobs page" },
              open_positions_count: { type: SchemaType.NUMBER, description: "Number of active job listings" }
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
      5. SOCIALS: Extract all identifiable social media handles and URLs (LinkedIn, Facebook, Twitter, Instagram, YouTube, Pinterest, Snapchat, TikTok, Telegram, WhatsApp, Skype).
      6. PAGES: Find the specific URLs for the "Contact Us" and "About Us" pages if available.
      7. ADVANCED: Identify technical stack (Technographics), SEO meta tags (Title/Desc), Foundation Year, and look for hiring/career page links.
      8. INDUSTRY: Categorize the company (e.g., B2B SaaS, IT Services, Healthcare).
      9. ICP SCORE: Calculate a score from 1 to 10 based on seniority (10: CXO/Owner, 7: Manager, 4: Individual Contributor).
      
      Content to analyze:
      ${contentToAnalyze}
    `;

    console.log("Sending prompt to Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonString = response.text();
    console.log("Received AI response length:", jsonString.length);
    
    let leads;
    try {
      leads = JSON.parse(jsonString);
    } catch (parseErr: any) {
      console.error("Failed to parse Gemini JSON:", jsonString);
      throw new Error(`AI returned invalid JSON: ${parseErr.message}`);
    }

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
          source: 'scraper',
          facebook_url: sanitizeField(lead.facebook_url),
          twitter_url: sanitizeField(lead.twitter_url),
          instagram_url: sanitizeField(lead.instagram_url),
          linkedin_url: sanitizeField(lead.linkedin_url_person || lead.linkedin_url),
          youtube_url: sanitizeField(lead.youtube_url),
          pinterest_url: sanitizeField(lead.pinterest_url),
          snapchat: sanitizeField(lead.snapchat),
          whatsapp: sanitizeField(lead.whatsapp),
          tiktok: sanitizeField(lead.tiktok),
          telegram: sanitizeField(lead.telegram),
          skype: sanitizeField(lead.skype),
          contact_page_url: sanitizeField(lead.contact_page_url),
          about_page_url: sanitizeField(lead.about_page_url),
          logo_url: sanitizeField(lead.logo_url),
          business_description: sanitizeField(lead.business_description),
          founded_year: sanitizeField(lead.founded_year),
          technographics: Array.isArray(lead.technographics) ? lead.technographics : [],
          meta_title: sanitizeField(lead.meta_title),
          meta_description: sanitizeField(lead.meta_description),
          primary_keywords: Array.isArray(lead.primary_keywords) ? lead.primary_keywords : [],
          website_language: sanitizeField(lead.website_language),
          career_page_url: sanitizeField(lead.career_page_url),
          open_positions_count: lead.open_positions_count || 0
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
