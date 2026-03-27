import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { leadId, url, userId } = await req.json();

    if (!leadId || !url || !userId) {
      return new Response(JSON.stringify({ error: 'leadId, url, and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Auditing lead ${leadId} with URL: ${url}`);

    const startTime = performance.now();
    const fetchUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // 1. SSL Check
    const isSsl = fetchUrl.startsWith('https://');

    // 2. Fetch & Basic Performance
    let html = '';
    let loadTimeMs = 0;
    let mobileFriendly = false;
    let brokenLinksCount = 0;
    let auditData: any = {
      hasH1: false,
      hasMetaDescription: false,
      missingAltTagsCount: 0,
      securityHeaders: {
        csp: false,
        xfo: false
      }
    };

    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        },
      });
      const endTime = performance.now();
      loadTimeMs = Math.round(endTime - startTime);
      
      if (response.ok) {
        html = await response.text();
        
        // Check for mobile viewport meta tag
        mobileFriendly = /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*["']/i.test(html);
        
        // --- NEW SEO & ACCESSIBILITY CHECKS ---
        auditData.hasH1 = /<h1[^>]*>/i.test(html);
        auditData.hasMetaDescription = /<meta[^>]*name=["']description["'][^>]*content=["'][^"']{20,}/i.test(html);
        
        const imgMatches = html.match(/<img[^>]+>/gi) || [];
        auditData.imgCount = imgMatches.length;
        const imgsWithAlt = html.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi) || [];
        auditData.missingAltTagsCount = Math.max(0, imgMatches.length - imgsWithAlt.length);

        // Check headers
        auditData.securityHeaders.csp = !!response.headers.get('content-security-policy');
        auditData.securityHeaders.xfo = !!response.headers.get('x-frame-options');
        
        // 3. Broken Link Scanner (up to 10 links)
        const linkMatches = html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi);
        const linksToCheck = [];
        let count = 0;
        for (const match of linkMatches) {
          if (count >= 10) break;
          linksToCheck.push(match[1]);
          count++;
        }

        const linkChecks = await Promise.all(
          linksToCheck.map(async (l) => {
            try {
              const res = await fetch(l, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
              return res.ok;
            } catch {
              return false;
            }
          })
        );
        brokenLinksCount = linkChecks.filter(ok => !ok).length;
      }
    } catch (e) {
      console.error(`Fetch failed for audit: ${e.message}`);
      auditData.error = e.message;
    }

    // 4. Google PageSpeed Insights (Optional)
    let psiPerformance = null;
    let psiAccessibility = null;
    let psiBestPractices = null;
    let psiSeo = null;

    const psiApiKey = Deno.env.get('PAGESPEED_API_KEY');
    if (psiApiKey) {
      try {
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fetchUrl)}&key=${psiApiKey}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&strategy=mobile`;
        const psiRes = await fetch(psiUrl);
        if (psiRes.ok) {
          const psiData = await psiRes.json();
          const categories = psiData.lighthouseResult.categories;
          psiPerformance = Math.round(categories.performance.score * 100);
          psiAccessibility = Math.round(categories.accessibility.score * 100);
          psiBestPractices = Math.round(categories['best-practices'].score * 100);
          psiSeo = Math.round(categories.seo.score * 100);
        }
      } catch (e) {
        console.error(`PSI API failed: ${e.message}`);
      }
    }

    // 5. Stricter Scoring Logic
    let score = 0;
    if (isSsl) score += 10; // (Reduced from 15)
    if (mobileFriendly) score += 15; // (Reduced from 20)
    
    // Performance (Stricter thresholds)
    if (loadTimeMs < 1000) score += 20;
    else if (loadTimeMs < 3000) score += 10;
    
    // Link Health
    if (brokenLinksCount === 0 && html) score += 15;
    else if (brokenLinksCount < 2) score += 5;

    // --- NEW: SEO & Content Checks (20 pts total) ---
    // If Lighthouse SEO is high, we can trust the SEO structure is likely fine
    const seoStrong = psiSeo ? psiSeo >= 90 : false;
    const finalHasH1 = auditData.hasH1 || seoStrong;

    if (finalHasH1) score += 10;
    if (auditData.hasMetaDescription || seoStrong) score += 5;
    
    if (auditData.imgCount > 0) {
      if (auditData.missingAltTagsCount === 0 || (psiAccessibility && psiAccessibility >= 90)) score += 5;
    } else {
      score += 5; 
    }

    // --- NEW: Security and Best Practices (20 pts total) ---
    if (auditData.securityHeaders.csp) score += 10;
    if (auditData.securityHeaders.xfo) score += 10;

    if (psiPerformance) {
      // If we have PSI, use it to refine the score (40% weight)
      // We exclude SEO from the average here to avoid redundant counting 
      // since we already checked H1/Meta above
      const psiAvg = (psiPerformance + psiAccessibility! + psiBestPractices!) / 3;
      score = Math.round((score * 0.6) + (psiAvg * 0.4));
    }

    // Ensure score is 0-100
    score = Math.min(100, Math.max(0, score));

    // 6. Save to Database
    const { data: auditRecord, error: dbError } = await supabase
      .from('lead_audits')
      .insert({
        lead_id: leadId,
        user_id: userId,
        ssl_enabled: isSsl,
        mobile_friendly: mobileFriendly,
        load_time_ms: loadTimeMs,
        broken_links_count: brokenLinksCount,
        lighthouse_performance: psiPerformance,
        lighthouse_accessibility: psiAccessibility,
        lighthouse_best_practices: psiBestPractices,
        lighthouse_seo: psiSeo,
        score: score,
        audit_data: {
          scanned_at: new Date().toISOString(),
          user_agent: 'StitchLeadScraper-AuditBot/1.0',
          ...auditData,
          hasH1: finalHasH1,
          hasMetaDescription: auditData.hasMetaDescription || seoStrong
        }
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return new Response(JSON.stringify({ success: true, data: auditRecord }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Audit Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
