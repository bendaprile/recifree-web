
// Auto-load all recipe JSON files from the ./recipes directory
const modules = import.meta.glob('./recipes/*.json', { eager: true });

// Convert the map of modules to an array of recipes
const recipes = Object.values(modules).map(module => module.default);

export default recipes;
