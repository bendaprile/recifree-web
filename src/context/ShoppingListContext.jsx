import { createContext, useContext, useState, useEffect } from 'react';

const ShoppingListContext = createContext();

export function useShoppingList() {
    return useContext(ShoppingListContext);
}

export function ShoppingListProvider({ children }) {
    // Initialize state from localStorage if available
    const [items, setItems] = useState(() => {
        try {
            const saved = localStorage.getItem('recifree_shopping_list');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load shopping list from localStorage', error);
            return [];
        }
    });

    // Persist to localStorage whenever items change
    useEffect(() => {
        try {
            localStorage.setItem('recifree_shopping_list', JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save shopping list to localStorage', error);
        }
    }, [items]);

    // Add a recipe's ingredients to the list
    const addRecipe = (recipe) => {
        setItems(prevItems => {
            // Check if recipe already exists in the list
            const existingRecipeIndex = prevItems.findIndex(item => item.recipeId === recipe.id);

            // Flatten ingredients handling both sectioned and flat formats
            let newIngredients = [];
            if (recipe.ingredients[0]?.items) {
                // Sectioned
                newIngredients = recipe.ingredients.flatMap(section =>
                    section.items.map(ing => ({
                        ...ing,
                        checked: false,
                        id: Math.random().toString(36).substr(2, 9)
                    }))
                );
            } else {
                // Flat
                newIngredients = recipe.ingredients.map(ing => ({
                    ...ing,
                    checked: false,
                    id: Math.random().toString(36).substr(2, 9)
                }));
            }

            if (existingRecipeIndex >= 0) {
                // Recipe exists, append ingredients to it (or we could choose to do nothing?)
                // For now, let's append to ensure if they want 2x they get it, 
                // though user might want to merge. Let's strictly add for now.
                const updatedItems = [...prevItems];
                updatedItems[existingRecipeIndex] = {
                    ...updatedItems[existingRecipeIndex],
                    ingredients: [...updatedItems[existingRecipeIndex].ingredients, ...newIngredients]
                };
                return updatedItems;
            } else {
                // New recipe group
                return [...prevItems, {
                    recipeId: recipe.id,
                    recipeTitle: recipe.title,
                    addedAt: new Date().toISOString(),
                    ingredients: newIngredients
                }];
            }
        });
    };

    // Remove a single ingredient from a recipe group
    const removeItem = (recipeId, ingredientId) => {
        setItems(prevItems => {
            return prevItems.map(group => {
                if (group.recipeId === recipeId) {
                    return {
                        ...group,
                        ingredients: group.ingredients.filter(ing => ing.id !== ingredientId)
                    };
                }
                return group;
            }).filter(group => group.ingredients.length > 0); // Remove empty groups
        });
    };

    // Remove an entire recipe group
    const removeRecipe = (recipeId) => {
        setItems(prevItems => prevItems.filter(group => group.recipeId !== recipeId));
    };

    // Toggle checked state of an ingredient
    const toggleItem = (recipeId, ingredientId) => {
        setItems(prevItems => {
            return prevItems.map(group => {
                if (group.recipeId === recipeId) {
                    return {
                        ...group,
                        ingredients: group.ingredients.map(ing =>
                            ing.id === ingredientId ? { ...ing, checked: !ing.checked } : ing
                        )
                    };
                }
                return group;
            });
        });
    };

    // Clear all items
    const clearList = () => {
        setItems([]);
    };

    // Get total item count
    const itemCount = items.reduce((total, group) => total + group.ingredients.length, 0);

    const value = {
        items,
        addRecipe,
        removeItem,
        removeRecipe,
        toggleItem,
        clearList,
        itemCount
    };

    return (
        <ShoppingListContext.Provider value={value}>
            {children}
        </ShoppingListContext.Provider>
    );
}
