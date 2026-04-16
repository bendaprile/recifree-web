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

// Ensure the crawler receives the HTML file
function getHtmlTemplate() {
    try {
        return fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
    } catch (e) {
        // Fallback simple HTML if index.html isn't properly copied during build
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
    try {
        // Fetch recipe from Firestore
        const snapshot = await db.collection('recipes').where('slug', '==', slug).limit(1).get();
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

        // Prepare Meta Tags
        const metaTags = `
            <meta property="og:title" content="${recipe.title} | Recifree" />
            <meta property="og:description" content="${recipe.description || 'View this recipe on Recifree.'}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <script type="application/ld+json">
                ${JSON.stringify(jsonLd)}
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
    .runWith({ maxInstances: 1 })
    .https.onRequest(app);
