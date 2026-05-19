const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { parseLdJson } = require('./parsers/ldJsonParser');
const { parseMicrodata } = require('./parsers/microdataParser');
const { parseHeuristics } = require('./parsers/heuristicParser');
const { sanitizeHtmlForLlm, extractWithLlm } = require('./parsers/llmParser');
const { mapToRecifreeSchema } = require('./parsers/schemaMapper');

/**
 * Verifies if the incoming request is authorized (Admin-Only).
 * Returns the verified user's email if valid.
 */
async function verifyAdminAuth(req) {
  // Local emulator bypass for easy CLI/curl testing
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (isEmulator) {
      console.warn('⚠️ Emulator detected: Proceeding WITHOUT auth token for testing purposes.');
      return 'admin-emulator-test@recifree.com';
    }
    throw new Error('UNAUTHORIZED: Missing Authorization Header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('UNAUTHORIZED: Invalid Authorization Header format');
  }

  const token = parts[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    // Rigid check: only Benjamin's email is allowed in Phase 2 Task 1
    const allowedAdmins = ['benjamin.daprile@gmail.com'];
    if (isEmulator) {
      // Allow general testing in local emulator
      allowedAdmins.push('admin-emulator-test@recifree.com');
    }

    if (!email || !allowedAdmins.includes(email)) {
      throw new Error(`FORBIDDEN: User ${email} is not authorized to extract recipes.`);
    }

    return email;
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    throw new Error(`UNAUTHORIZED: ${error.message}`);
  }
}

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
    // 2. Gatekeeper Authentication & Authorization
    let userEmail;
    try {
      userEmail = await verifyAdminAuth(req);
    } catch (authError) {
      const status = authError.message.includes('FORBIDDEN') ? 403 : 401;
      res.status(status).json({ error: authError.message });
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

    console.log(`Starting recipe extraction for: ${url} initiated by ${userEmail}`);

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
      res.status(422).json({ error: `Failed to retrieve the web page (Status: ${response.status}). The website might be blocking requests or temporarily down.` });
      return;
    }

    const htmlText = await response.text();

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
        res.status(422).json({ error: 'Failed to extract recipe. The website does not contain standard recipe metadata, and the AI fallback failed.' });
        return;
      }
    }

    // 5. Schema Normalization
    if (!rawRecipeData) {
      res.status(422).json({ error: 'Failed to extract recipe. No structured recipe data or recipe lists could be found on the page.' });
      return;
    }

    // Ensure the source URL is attached to the raw data for mapping
    rawRecipeData.source = rawRecipeData.source || {};
    rawRecipeData.source.url = url;

    const normalizedRecipe = mapToRecifreeSchema(rawRecipeData);

    // Attach debugging/monitoring metadata
    normalizedRecipe._extractionMeta = {
      method: methodUsed,
      parsedAt: new Date().toISOString(),
      extractedBy: userEmail
    };

    console.log(`Successfully completed extraction via method: ${methodUsed}`);
    res.status(200).json(normalizedRecipe);

  } catch (globalError) {
    console.error('Global extraction endpoint error:', globalError);
    res.status(500).json({ error: `An internal server error occurred: ${globalError.message}` });
  }
}

module.exports = {
  extractRecipeOrchestrator,
  verifyAdminAuth,
  validateUrl
};
