const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');

admin.initializeApp();
const db = admin.firestore();
const app = express();

// Helper to flatten ingredients (same logic as Recipe.jsx)
function getFlatIngredients(recipe) {
    if (!recipe.ingredients) return [];
    if (recipe.ingredients[0] && recipe.ingredients[0].items) {
        return recipe.ingredients.flatMap(section => section.items);
    }
    return recipe.ingredients;
}

// Cache the HTML template in memory to avoid disk I/O on every request
let htmlTemplate = null;
function getHtmlTemplate() {
    if (htmlTemplate) return htmlTemplate;
    try {
        htmlTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
        return htmlTemplate;
    } catch (e) {
        console.warn('Could not find index.html, using fallback template');
        return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recifree</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    }
}

// The `recipes` collection is world-readable and the whole document is
// serialised into window.__INITIAL_RECIPE__ below, so anything private stored
// on a recipe ends up in public page source. Nothing private should be written
// there in the first place; this is the second line of defence.
const PRIVATE_RECIPE_FIELDS = ['publishedBy', 'extractedBy', '_extractionMeta'];

/**
 * Escapes a value for interpolation into an HTML attribute. Recipe titles and
 * descriptions come from third-party pages and from users, so a stray quote
 * would otherwise break out of the attribute it sits in.
 */
function escapeAttribute(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function toPublicRecipe(recipe) {
    const safe = { ...recipe };
    PRIVATE_RECIPE_FIELDS.forEach(field => delete safe[field]);

    // Firestore cannot store arrays of arrays, so stepIngredients is persisted
    // as a JSON string and parsed back by recipeService on the client's own
    // fetch path. The hydration payload below bypasses that path entirely, so
    // parse here too — otherwise the client calls .map on a string and the page
    // crashes. This shipped broken with SSR and stayed invisible while the
    // function was returning 403 to everyone.
    if (typeof safe.stepIngredients === 'string') {
        try {
            safe.stepIngredients = JSON.parse(safe.stepIngredients);
        } catch {
            safe.stepIngredients = [];
        }
    }

    return safe;
}

app.get('/recipe/:slug', async (req, res) => {
    const slug = req.params.slug;
    console.time(`fetch-recipe-${slug}`);
    try {
        // Fetch recipe from Firestore
        const snapshot = await db.collection('recipes').where('slug', '==', slug).limit(1).get();
        console.timeEnd(`fetch-recipe-${slug}`);

        if (snapshot.empty) {
            return res.status(404).send(getHtmlTemplate());
        }

        const recipe = toPublicRecipe(snapshot.docs[0].data());
        let html = getHtmlTemplate();

        // Prepare JSON-LD Schema
        const flatIngredients = getFlatIngredients(recipe);
        const ingredientStrings = flatIngredients.map(ing => 
            `${ing.amount || ''} ${ing.unit || ''} ${ing.item}`.trim()
        );

        const instructionStrings = (recipe.instructions || []).map(step => ({
            "@type": "HowToStep",
            "text": step
        }));

        const defaultImage = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&auto=format&fit=crop&q=80';
        const imageUrl = recipe.image || defaultImage;

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": recipe.title || 'Recipe',
            "image": imageUrl,
            "description": recipe.description || '',
            "author": {
                "@type": "Organization",
                "name": "Recifree"
            },
            "recipeIngredient": ingredientStrings,
            "recipeInstructions": instructionStrings,
        };

        // Prepare Meta Tags & Hydration Script
        // We inject the recipe data into window..__INITIAL_RECIPE__ so the client
        // can pick it up immediately without a second Firestore fetch.
        const metaTags = `
            <meta property="og:title" content="${escapeAttribute(recipe.title)} | Recifree" />
            <meta property="og:description" content="${escapeAttribute(recipe.description || 'View this recipe on Recifree.')}" />
            <meta property="og:image" content="${escapeAttribute(imageUrl)}" />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <script type="application/ld+json">
                ${JSON.stringify(jsonLd)}
            </script>
            <script id="hydration-data">
                window.__INITIAL_RECIPE__ = ${JSON.stringify(recipe).replace(/</g, '\\u003c')};
            </script>
        `;

        // Inject into HTML <head> using regex for robustness
        html = html.replace(/<title>.*?<\/title>/, `<title>${escapeAttribute(recipe.title)} | Recifree</title>`);
        html = html.replace('</head>', `${metaTags}\n</head>`);

        // Send modified HTML (Bots read the tags, React hydrates inside #root as normal)
        res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
        res.status(200).send(html);

    } catch (error) {
        console.error('Error fetching dynamic recipe:', error);
        res.status(500).send(getHtmlTemplate());
    }
});

exports.ssrRecipe = functions
    .runWith({ maxInstances: 3 })
    .https.onRequest(app);

const { extractRecipeOrchestrator } = require('./extractRecipe');

exports.extractRecipe = functions
    .runWith({ maxInstances: 3, secrets: ['GEMINI_API_KEY'] })
    .https.onRequest(extractRecipeOrchestrator);

const { capabilities, deleteRecipe } = require('./adminRecipes');

// Small and called on sign-in; the client has no other way to learn whether it
// may show destructive controls.
exports.capabilities = functions
    .runWith({ maxInstances: 3 })
    .https.onRequest(capabilities);

exports.deleteRecipe = functions
    .runWith({ maxInstances: 3 })
    .https.onRequest(deleteRecipe);

const { publishRecipe } = require('./publishRecipe');

// Photos arrive base64-encoded in the request body, so this needs a larger
// payload ceiling than the default 256MB memory tier comfortably handles.
exports.publishRecipe = functions
    .runWith({ maxInstances: 3, memory: '512MB' })
    .https.onRequest(publishRecipe);

