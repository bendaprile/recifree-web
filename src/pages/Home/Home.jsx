import { useState, useMemo } from 'react';
import RecipeCard from '../../components/RecipeCard/RecipeCard';
import recipes from '../../data/recipes';
import './Home.css';

function Home() {
    const [selectedTag, setSelectedTag] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Get all unique tags
    const allTags = useMemo(() => {
        const tags = new Set();
        recipes.forEach(recipe => {
            recipe.tags?.forEach(tag => tags.add(tag));
        });
        return ['All', ...Array.from(tags).sort()];
    }, []);

    // Filter recipes based on selected tag and search query
    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe => {
            const matchesTag = selectedTag === 'All' || recipe.tags?.includes(selectedTag);
            const matchesSearch = searchQuery === '' ||
                recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTag && matchesSearch;
        });
    }, [selectedTag, searchQuery]);

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content animate-slide-up">
                        <h1 className="hero-title">
                            Recipes Without <span className="text-gradient">the Clutter</span>
                        </h1>
                        <p className="hero-subtitle">
                            Simple, straightforward recipes. No life stories, no ads, no distractions.
                            Just ingredients and steps to create something delicious.
                        </p>

                        <div className="hero-search">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search for a recipe..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="hero-decoration">
                    <div className="decoration-circle circle-1"></div>
                    <div className="decoration-circle circle-2"></div>
                    <div className="decoration-circle circle-3"></div>
                </div>
            </section>

            {/* Recipe Grid Section */}
            <section className="recipes-section section">
                <div className="container">
                    {/* Tag Filters */}
                    <div className="tag-filters">
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                className={`tag-filter ${selectedTag === tag ? 'active' : ''}`}
                                onClick={() => setSelectedTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Recipe Count */}
                    <p className="recipe-count">
                        Showing {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
                        {selectedTag !== 'All' && ` in "${selectedTag}"`}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>

                    {/* Recipe Grid */}
                    {filteredRecipes.length > 0 ? (
                        <div className="recipe-grid">
                            {filteredRecipes.map(recipe => (
                                <RecipeCard key={recipe.id} recipe={recipe} />
                            ))}
                        </div>
                    ) : (
                        <div className="no-recipes">
                            <span className="no-recipes-icon">🍽️</span>
                            <h3>No recipes found</h3>
                            <p>Try adjusting your search or filters</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSelectedTag('All');
                                    setSearchQuery('');
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section section">
                <div className="container">
                    <h2 className="section-title text-center">Why Recifree?</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <span className="feature-icon">🚫</span>
                            <h3>No Ads. Ever.</h3>
                            <p>We believe recipes should be free from visual clutter and interruptions.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">📖</span>
                            <h3>Just the Recipe</h3>
                            <p>No 10-paragraph stories about grandma's kitchen. Just ingredients and steps.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">⚡</span>
                            <h3>Lightning Fast</h3>
                            <p>Lightweight pages that load instantly, even on slow connections.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">💚</span>
                            <h3>100% Free</h3>
                            <p>Open source and community-driven. No paywalls, no premium tiers.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
