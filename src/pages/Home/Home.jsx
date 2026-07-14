import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RecipeCard from '../../components/RecipeCard/RecipeCard';
import { getAllRecipes } from '../../services/recipeService';
import { PlateIcon } from '../../components/Icons/Icons';
import './Home.css';

function Home() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q') || '';
    
    const [selectedTag, setSelectedTag] = useState('All');
    const [searchQuery, setSearchQuery] = useState(queryParam);
    const [gridColumns, setGridColumns] = useState(3);

    // Keep local state in sync when URL parameters change externally
    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        if (value) {
            setSearchParams({ q: value }, { replace: true });
        } else {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('q');
            setSearchParams(newParams, { replace: true });
        }
    };

    useEffect(() => {
        getAllRecipes()
            .then(setRecipes)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Get all unique tags
    const [isTagsExpanded, setIsTagsExpanded] = useState(false);
    const INITIAL_TAG_COUNT = 10;

    // Get all unique tags sorted by popularity (recipe count)
    const { allTags, visibleTags, hasMoreTags } = useMemo(() => {
        const tagCounts = {};
        recipes.forEach(recipe => {
            recipe.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // Sort tags by count (descending), then alphabetically
        const sortedTags = Object.keys(tagCounts).sort((a, b) => {
            const countDiff = tagCounts[b] - tagCounts[a];
            return countDiff !== 0 ? countDiff : a.localeCompare(b);
        });

        const fullTagList = ['All', ...sortedTags];

        return {
            allTags: fullTagList,
            visibleTags: isTagsExpanded ? fullTagList : fullTagList.slice(0, INITIAL_TAG_COUNT),
            hasMoreTags: fullTagList.length > INITIAL_TAG_COUNT
        };
    }, [isTagsExpanded, recipes]);

    // Filter recipes based on selected tag and search query
    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe => {
            const matchesTag = selectedTag === 'All' || recipe.tags?.includes(selectedTag);
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                recipe.title.toLowerCase().includes(searchLower) ||
                recipe.description.toLowerCase().includes(searchLower) ||
                recipe.tags?.some(tag => tag.toLowerCase().includes(searchLower));
            return matchesTag && matchesSearch;
        });
    }, [selectedTag, searchQuery, recipes]);

    return (
        <div className="home">
            {/* Compact Editorial Header */}
            <header className="home-header">
                <div className="container">
                    <div className="home-header-grid animate-slide-up">
                        <div className="home-header-info">
                            <h1 className="hero-title">
                                Recipes Without <span className="text-gradient">the Clutter</span>
                            </h1>
                            <p className="hero-subtitle">
                                No ads. No pop-ups. No life stories. Just the recipe. That's Recifree.
                            </p>
                        </div>

                        <div className="home-header-actions">
                            <div className="hero-search">
                                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search for a recipe..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button 
                                        className="search-clear-btn" 
                                        onClick={() => handleSearchChange('')}
                                        aria-label="Clear search"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Recipe Grid Section */}
            <section className="recipes-section section">
                <div className="container">
                    {/* Tag Filters */}
                    <div className="tag-filters">
                        {visibleTags.map(tag => (
                            <button
                                key={tag}
                                className={`tag-filter ${selectedTag === tag ? 'active' : ''}`}
                                onClick={() => setSelectedTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}

                        {hasMoreTags && (
                            <button
                                className="tag-toggle-btn"
                                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                            >
                                {isTagsExpanded ? 'Show Less' : `Show More (${allTags.length - INITIAL_TAG_COUNT}+)`}
                            </button>
                        )}
                    </div>

                    {/* Controls Container */}
                    <div className="list-controls-container">
                        <p className="recipe-count">
                            Showing {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
                            {selectedTag !== 'All' && ` in "${selectedTag}"`}
                            {searchQuery && ` matching "${searchQuery}"`}
                        </p>

                        <div className="grid-size-controls">
                            <span className="controls-label">Columns:</span>
                            {[3, 5].map(cols => (
                                <button
                                    key={cols}
                                    className={`grid-size-btn ${gridColumns === cols ? 'active' : ''}`}
                                    onClick={() => setGridColumns(cols)}
                                    title={`View ${cols} items per row`}
                                >
                                    {cols}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recipe Grid */}
                    {loading ? (
                        <div className="recipe-grid-loading" role="status" aria-label="Loading recipes">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="recipe-card-skeleton" aria-hidden="true" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="no-recipes">
                            <PlateIcon size={48} className="no-recipes-icon" />
                            <h3>Couldn't load recipes</h3>
                            <p>{error}</p>
                        </div>
                    ) : filteredRecipes.length > 0 ? (
                        <div className={`recipe-grid columns-${gridColumns}`}>
                            {filteredRecipes.map(recipe => (
                                <RecipeCard key={recipe.id} recipe={recipe} />
                            ))}
                        </div>
                    ) : (
                        <div className="no-recipes">
                            <PlateIcon size={48} className="no-recipes-icon" />
                            <h3>No recipes found</h3>
                            <p>Try adjusting your search or filters</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSelectedTag('All');
                                    handleSearchChange('');
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
                            <span className="feature-icon">×</span>
                            <h3>No Ads. Ever.</h3>
                            <p>We believe recipes should be free from visual clutter and interruptions.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">≡</span>
                            <h3>Just the Recipe</h3>
                            <p>No 10-paragraph stories about grandma's kitchen. Just ingredients and steps.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">→</span>
                            <h3>Lightning Fast</h3>
                            <p>Lightweight pages that load instantly, even on slow connections.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">♥</span>
                            <h3>100% Free</h3>
                            <p>Open source and community-driven. No paywalls, no premium tiers.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">✓</span>
                            <h3>Real & Tested</h3>
                            <p>No AI-generated fluff. Every recipe is hand-picked, kitchen-tested, and guaranteed to be delicious.</p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">🔒</span>
                            <h3>Privacy First</h3>
                            <p>No tracking, no ads, no data selling. Your data is yours, with optional accounts to save and sync your collection.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
