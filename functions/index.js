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

        const recipe = snapshot.docs[0].data();
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
            <meta property="og:title" content="${recipe.title} | Recifree" />
            <meta property="og:description" content="${recipe.description || 'View this recipe on Recifree.'}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <script type="application/ld+json">
                ${JSON.stringify(jsonLd)}
            </script>
            <script id="hydration-data">
                window.__INITIAL_RECIPE__ = ${JSON.stringify(recipe)};
            </script>
        `;

        // Inject into HTML <head>
        html = html.replace('<title>Recifree | Recipes Without the Clutter</title>', `<title>${recipe.title} | Recifree</title>`);
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
