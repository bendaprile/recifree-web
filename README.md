# Recifree

**Recipes without the clutter.** A 100% free, open-source, ad-free recipe website.

## ✨ Features

- 🚫 **No ads** - Ever. We promise.
- 📖 **No life stories** - Just ingredients and steps
- ⚡ **Lightning fast** - Minimal, optimized code
- 💚 **100% free** - Open source, no premium tiers
- 📱 **Mobile-first** - Works beautifully on any device
- 🖨️ **Print-friendly** - Clean recipe printouts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/recifree.git
cd recifree

# Install dependencies
npm install

# Start development server (boots Vite + Firebase Emulators concurrently)
npm run dev

# Open a second terminal to seed the local database with existing recipes
npm run migrate:local
```

The site will be available at `http://localhost:5173`. You can view the local Firestore emulator at `http://127.0.0.1:4000`.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist` folder.

## 🌐 Deployment

This project is configured for Firebase Hosting with GitHub Actions for CI/CD.

### Setup Firebase Hosting

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Login: `firebase login`
4. Update `.firebaserc` with your project ID
5. Deploy manually: `firebase deploy`

### Automatic Deployments

Push to the `main` branch to trigger automatic deployment. See `.github/workflows/deploy.yml` for configuration.

Required GitHub Secrets:
- `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON key

## 📁 Project Structure

```
recifree/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── data/            # Recipe data (JSON)
│   ├── services/        # Service layer (Firebase/Firestore)
│   └── styles/          # Global styles
├── functions/           # Cloud Functions (SEO Metadata Injection)
├── public/              # Static assets
└── .github/workflows/   # CI/CD configuration
```

## 🍽️ Adding Recipes

Recipes are accessed exclusively through `src/services/recipeService.js`. Raw schemas are stored in `src/data/recipes/[slug].json`. Each recipe follows this schema:

```json
{
  "id": "unique-slug",
  "title": "Recipe Name",
  "description": "Brief description",
  "image": "/images/recipes/recipe.jpg",
  "prepTime": "10 mins",
  "cookTime": "25 mins",
  "totalTime": "35 mins",
  "servings": 4,
  "difficulty": "Easy",
  "tags": ["Italian", "Pasta"],
  "ingredients": [
    { "amount": "1", "unit": "lb", "item": "pasta" }
  ],
  "instructions": [
    "Step one...",
    "Step two..."
  ],
  "source": {
    "name": "Original Source",
    "url": "https://example.com/recipe"
  }
}
```

Whenever you add a new recipe JSON file locally, you should push it to the database:
```bash
# Push to production
npm run migrate

# Push to your local emulator for testing
npm run migrate:local
```

## ⚖️ Legal Notice

Recifree respects content creators. We:
- Always attribute recipes to their original sources
- Rewrite instructions in our own words
- Never copy original photographs
- Provide links back to the original recipe

If you would like a recipe removed, please open an issue.

## 📝 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for home cooks everywhere.
