const admin = require('firebase-admin');

/**
 * Constructs a descriptive food photography prompt.
 * @param {string} recipeTitle
 * @param {string[]} tags
 * @returns {string} The constructed prompt
 */
function buildImagenPrompt(recipeTitle, tags = []) {
  const sanitizedTitle = (recipeTitle || 'delicious dish').trim();
  const tagsList = Array.isArray(tags) ? tags.filter(t => typeof t === 'string' && t.trim() !== '') : [];
  
  let prompt = `A high-quality, professional food photograph of ${sanitizedTitle}, beautifully presented in a minimalist ceramic bowl on a clean wooden table. Soft natural light, shallow depth of field, warm atmosphere, no text or overlays.`;
  if (tagsList.length > 0) {
    prompt += ` Tags: ${tagsList.join(', ')}`;
  }
  return prompt;
}

/**
 * Calls the Google Gemini API to generate a food photo.
 * @param {string} prompt
 * @returns {Promise<string|null>} Base64-encoded image string or null if failed
 */
async function generateAiFoodPhoto(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini Image API call skipped: GEMINI_API_KEY environment variable is missing.');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Gemini Image API error response (status ${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let base64Image = null;
    
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      console.warn('Gemini Image API returned no base64 image data in candidate parts.');
      return null;
    }

    return base64Image;
  } catch (error) {
    console.error('Graceful fallback triggered: Gemini Image API call failed:', error.message);
    return null;
  }
}

/**
 * Decodes base64 string to a buffer and uploads it to Firebase Storage.
 * @param {string} base64Image
 * @param {string} recipeId
 * @returns {Promise<string|null>} Direct public URL or null if failed
 */
const EXTENSION_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

/**
 * Resolves the project's Storage bucket, once, and caches it.
 *
 * Projects created before the bucket rename report `<project>.appspot.com` as
 * the default in FIREBASE_CONFIG, while Storage provisioned today lives at
 * `<project>.firebasestorage.app`. Trusting the default silently uploads into
 * a bucket that does not exist, which is how every generated image on this
 * project was lost: the save threw, the caller caught it, and the recipe was
 * written with no photo.
 *
 * Deliberately not cached. Resolution is one metadata call, uploads are rare,
 * and no cache means a bucket provisioned after deploy is picked up without
 * waiting for a cold start.
 */
async function getStorageBucket() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const candidates = [admin.storage().bucket()];
  if (projectId) {
    candidates.push(admin.storage().bucket(`${projectId}.firebasestorage.app`));
  }

  for (const candidate of candidates) {
    try {
      const [exists] = await candidate.exists();
      if (exists) {
        console.log(`Using Storage bucket: ${candidate.name}`);
        return candidate;
      }
      console.warn(`Storage bucket does not exist: ${candidate.name}`);
    } catch (error) {
      console.warn(`Could not reach bucket ${candidate.name}: ${error.message}`);
    }
  }

  throw new Error('No Firebase Storage bucket is available for this project.');
}

async function uploadImageToStorage(base64Image, recipeId, contentType = 'image/png') {
  if (!base64Image || !recipeId) {
    console.warn('Skipping upload: missing base64Image or recipeId');
    return null;
  }

  try {
    const bucket = await getStorageBucket();
    const bucketName = bucket.name;
    const extension = EXTENSION_BY_TYPE[contentType] || 'png';
    const filePath = `recipes/${recipeId}/image.${extension}`;
    const file = bucket.file(filePath);

    const buffer = Buffer.from(base64Image, 'base64');
    await file.save(buffer, {
      metadata: { contentType },
    });

    try {
      await file.makePublic();
    } catch (e) {
      console.warn(`Could not make file public: ${e.message}`);
    }

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;
    return publicUrl;
  } catch (error) {
    console.error('Firebase Storage upload failed:', error.message);
    return null;
  }
}

module.exports = {
  buildImagenPrompt,
  getStorageBucket,
  generateAiFoodPhoto,
  uploadImageToStorage
};
