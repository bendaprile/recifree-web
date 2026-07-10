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
async function uploadImageToStorage(base64Image, recipeId) {
  if (!base64Image || !recipeId) {
    console.warn('Skipping upload: missing base64Image or recipeId');
    return null;
  }

  try {
    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;
    const filePath = `recipes/${recipeId}/image.png`;
    const file = bucket.file(filePath);

    const buffer = Buffer.from(base64Image, 'base64');
    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
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
  generateAiFoodPhoto,
  uploadImageToStorage
};
