const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { parseLdJson } = require('./parsers/ldJsonParser');
const { parseMicrodata } = require('./parsers/microdataParser');
const { parseHeuristics } = require('./parsers/heuristicParser');
const { sanitizeHtmlForLlm, extractWithLlm } = require('./parsers/llmParser');
const { identifyCaller, TIER_ADMIN } = require('./security/callerTier');
const { mapToRecifreeSchema } = require('./parsers/schemaMapper');
const { buildImagenPrompt, generateAiFoodPhoto, uploadImageToStorage } = require('./imageGen/imagenService');
const { normalizeUrl, hashUrl, checkCache, saveToCache } = require('./cache/extractionCache');
const { checkRateLimit } = require('./security/rateLimiter');
const { findPublishedByUrlHash, alternateUrlsFor } = require('./publishedLookup');

/**
 * Validates the URL string.
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('BAD_REQUEST: URL is required and must be a string.');
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('BAD_REQUEST: Invalid protocol. Only HTTP and HTTPS are supported.');
    }
    
    // Prevent SSRF: block localhost/private IPs
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' || 
      host === '127.0.0.1' || 
      host === '0.0.0.0' || 
      host.startsWith('192.168.') || 
      host.startsWith('10.')
    ) {
      throw new Error('BAD_REQUEST: Accessing local or private network domains is forbidden.');
    }
  } catch (e) {
    throw new Error(`BAD_REQUEST: Invalid URL structure: ${e.message}`);
  }
}

/**
 * The site's hostname, for error copy. A user who pastes a URL knows the site
 * by its domain, and naming it is the difference between "something broke" and
 * "this publisher will not let us in, so type it in yourself".
 */
function siteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'That site';
  }
}

/** The deduplication key for a URL, or null when there is nothing to key on. */
function safeHash(url) {
  if (!url) return null;
  try {
    return hashUrl(normalizeUrl(url));
  } catch {
    return null;
  }
}

/**
 * Orchestrates the full 3-layer recipe extraction process.
 */
async function extractRecipeOrchestrator(req, res) {
  // 1. CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    // 2. Identify the caller and the spend tier they are entitled to.
    // Anonymous callers are allowed in; they simply cannot reach a paid layer.
    let caller;
    try {
      caller = await identifyCaller(req);
    } catch (authError) {
      res.status(401).json({ error: authError.message });
      return;
    }
    const canUsePaidLayers = caller.tier === TIER_ADMIN;

    // 2b. Rate Limiting (10/hour), keyed by email or by hashed IP.
    try {
      await checkRateLimit(caller.id);
    } catch (rateError) {
      res.status(429).json({ error: rateError.message });
      return;
    }

    // 3. Extract inputs
    const { url } = req.body || {};
    try {
      validateUrl(url);
    } catch (urlError) {
      res.status(400).json({ error: urlError.message });
      return;
    }

    console.log(`Starting recipe extraction for: ${url} (tier: ${caller.tier})`);

    // Normalize URL and hash it
    let normalizedUrl;
    let urlHash;
    try {
      normalizedUrl = normalizeUrl(url);
      urlHash = hashUrl(normalizedUrl);
    } catch (normError) {
      res.status(400).json({ error: `URL normalization failed: ${normError.message}` });
      return;
    }

    // Already in the public catalog? Route the user there instead of parsing a
    // second copy of the same recipe. This runs before the page is fetched, so
    // a duplicate paste costs one indexed query and nothing else.
    const publishedSlug = await findPublishedByUrlHash(admin.firestore(), urlHash);
    if (publishedSlug) {
      console.log(`Duplicate paste for ${url} — already published as ${publishedSlug}`);
      res.status(200).json({ duplicate: true, slug: publishedSlug });
      return;
    }

    // Check extraction cache
    try {
      const cachedRecipe = await checkCache(urlHash);
      if (cachedRecipe) {
        console.log(`Cache HIT for ${url} (hash: ${urlHash})`);

        // A cache hit returns before the page is fetched, so the redirect and
        // canonical checks below never run. The cached recipe already records
        // the address the page answers to; if that differs from the paste, it
        // is the one to match against the catalog.
        const cachedSourceHash = safeHash(cachedRecipe.source && cachedRecipe.source.url);
        if (cachedSourceHash && cachedSourceHash !== urlHash) {
          const publishedFromCache = await findPublishedByUrlHash(admin.firestore(), cachedSourceHash);
          if (publishedFromCache) {
            console.log(`Duplicate paste for ${url} via the cached source URL — already published as ${publishedFromCache}`);
            res.status(200).json({ duplicate: true, slug: publishedFromCache });
            return;
          }
        }

        res.status(200).json({ ...cachedRecipe, sourceUrlHash: urlHash });
        return;
      }
      console.log(`Cache MISS for ${url} (hash: ${urlHash})`);
    } catch (cacheError) {
      console.error('Failed to read from extraction cache:', cacheError);
    }

    // 4. Fetch HTML using native global fetch (Node 22)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      // Some publishers block server-side fetches outright. Cloudflare bot
      // management on the Dotdash Meredith sites (eatingwell, allrecipes,
      // seriouseats, simplyrecipes, foodandwine) answers with a challenge page
      // and no recipe in it. Nothing to parse means nothing we can do here, so
      // hand the user to the manual form rather than leaving them on a dead end.
      console.log(`Fetch blocked for ${url}: HTTP ${response.status}`);
      res.status(422).json({
        error: `${siteName(url)} does not allow automated imports, so we could not read this one. You can enter it by hand instead — it takes a minute.`,
        canRetryManually: true
      });
      return;
    }

    const htmlText = await response.text();

    // The pasted address is not always the page's own. A Pinterest link or a
    // shortener redirects, and a permalink often 301s to a slug. Check the
    // addresses the page answers to before parsing a second copy of a recipe
    // that is already in the catalog.
    for (const alternate of alternateUrlsFor(url, response.url, htmlText)) {
      const alternateHash = safeHash(alternate);
      if (!alternateHash || alternateHash === urlHash) continue;

      const publishedAlternate = await findPublishedByUrlHash(admin.firestore(), alternateHash);
      if (publishedAlternate) {
        console.log(`Duplicate paste for ${url} via ${alternate} — already published as ${publishedAlternate}`);
        res.status(200).json({ duplicate: true, slug: publishedAlternate });
        return;
      }
    }

    let rawRecipeData = null;
    let methodUsed = '';

    // --- LAYER 1: ld+json structured schema ---
    console.log('Layer 1: Attempting JSON-LD extraction...');
    rawRecipeData = parseLdJson(htmlText);
    
    if (rawRecipeData) {
      methodUsed = 'ld+json';
      console.log('Layer 1 Success: JSON-LD recipe found.');
    }

    // --- LAYER 1b: HTML Microdata ---
    if (!rawRecipeData) {
      console.log('Layer 1b: Attempting Microdata extraction...');
      rawRecipeData = parseMicrodata(htmlText);
      if (rawRecipeData) {
        methodUsed = 'microdata';
        console.log('Layer 1b Success: Microdata recipe found.');
      }
    }

    // --- LAYER 2: HTML Heuristics (WordPress plugins) ---
    if (!rawRecipeData) {
      console.log('Layer 2: Attempting CSS plugin heuristics...');
      rawRecipeData = parseHeuristics(htmlText);
      if (rawRecipeData) {
        methodUsed = 'heuristic';
        console.log('Layer 2 Success: Heuristic recipe found.');
      }
    }

    // --- LAYER 3: LLM Fallback (Gemini API) ---
    // Paid. Restricted callers stop at the free parser layers and are routed to
    // the manual entry form instead. This is the only thing standing between an
    // anonymous visitor and the Gemini bill.
    if (!rawRecipeData && !canUsePaidLayers) {
      console.log('Layer 3 skipped: caller is not entitled to paid layers.');
      res.status(422).json({
        error: `${siteName(url)} does not publish standard recipe data, so we could not read this one automatically. You can enter it by hand instead — it takes a minute.`,
        canRetryManually: true
      });
      return;
    }

    if (!rawRecipeData) {
      console.log('Layer 3: Attempting Gemini LLM fallback...');
      const sanitizedText = sanitizeHtmlForLlm(htmlText);
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('LLM Layer failed: GEMINI_API_KEY environment variable is missing.');
        res.status(500).json({ error: 'LLM extraction is required for this site, but the Gemini API Key is not configured on the server.' });
        return;
      }

      try {
        rawRecipeData = await extractWithLlm(sanitizedText, apiKey);
        methodUsed = 'llm';
        console.log('Layer 3 Success: Gemini LLM extracted recipe.');
      } catch (llmError) {
        console.error('Layer 3 LLM execution failed:', llmError.message);
        res.status(422).json({
          error: `${siteName(url)} does not publish standard recipe data, and the AI fallback failed on it too. You can enter it by hand instead — it takes a minute.`,
          canRetryManually: true
        });
        return;
      }
    }

    // 5. Schema Normalization
    if (!rawRecipeData) {
      res.status(422).json({
        error: `We could not find a recipe on that ${siteName(url)} page. You can enter it by hand instead — it takes a minute.`,
        canRetryManually: true
      });
      return;
    }

    // Attribute to the address the page answers to, not to the shortener or
    // tracking wrapper the reader happened to paste. It is the link the
    // original creator gets credited with, and the key a later paste matches.
    rawRecipeData.source = rawRecipeData.source || {};
    rawRecipeData.source.url = response.url || url;

    const normalizedRecipe = mapToRecifreeSchema(rawRecipeData);

    // Trigger AI food photo generation to ensure copyright-free unique image
    // Clear the original scraped image first to prevent any accidental leakage of copyrighted images
    const originalImageUrl = normalizedRecipe.image;
    if (normalizedRecipe.image && !normalizedRecipe.image.includes('firebasestorage.googleapis.com')) {
      normalizedRecipe.image = '';
    }

    try {
      // Imagen is paid, so restricted callers get no generated photo. They are
      // expected to supply their own image at publish time anyway.
      if (!normalizedRecipe.image && canUsePaidLayers) {
        console.log(`Generating unique AI food photo for "${normalizedRecipe.title}" to avoid copyright scraping...`);
        const prompt = buildImagenPrompt(normalizedRecipe.title, normalizedRecipe.tags);
        const base64Image = await generateAiFoodPhoto(prompt);
        if (base64Image) {
          const storageUrl = await uploadImageToStorage(base64Image, normalizedRecipe.id);
          if (storageUrl) {
            normalizedRecipe.image = storageUrl;
            console.log(`Successfully uploaded AI food photo: ${storageUrl}`);
          }
        }
      }
    } catch (imageError) {
      console.error('Graceful fallback: AI image generation failed:', imageError);
      // Ensure image is empty if generation failed, to avoid showing copyrighted images
      normalizedRecipe.image = '';
    }

    // Attach debugging/monitoring metadata.
    // Never record the extracting user here. The extraction cache is shared across
    // all users and its documents are returned verbatim on a cache hit, so anything
    // stored on this object is visible to every other user who pastes the same URL.
    normalizedRecipe._extractionMeta = {
      method: methodUsed,
      parsedAt: new Date().toISOString()
    };

    // Save to extraction cache
    try {
      await saveToCache(urlHash, normalizedRecipe);
    } catch (cacheSaveError) {
      console.error('Failed to save to extraction cache:', cacheSaveError);
    }

    console.log(`Successfully completed extraction via method: ${methodUsed}`);
    // The deduplication key travels with the recipe so the shelf can recognise
    // a URL the user already holds, without the frontend having to reimplement
    // normalizeUrl and drift from it. Attached after saveToCache, so the key is
    // never stored inside the document it keys.
    res.status(200).json({ ...normalizedRecipe, sourceUrlHash: urlHash });

  } catch (globalError) {
    console.error('Global extraction endpoint error:', globalError);
    res.status(500).json({ error: `An internal server error occurred: ${globalError.message}` });
  }
}

module.exports = {
  extractRecipeOrchestrator,
  validateUrl,
  siteName
};
