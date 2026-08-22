import { useNavigate, useParams, Link } from 'react-router-dom';
import { useShelf } from '../../context/ShelfContext';
import ManualRecipeForm from '../AddRecipe/components/ManualRecipeForm';
import './ShelfEdit.css';

/**
 * Editing a draft on the user's shelf.
 *
 * A parser gets ingredients subtly wrong often enough that a draft you cannot
 * correct is not much of a draft. Reuses ManualRecipeForm rather than growing a
 * second editor: it already takes initialData and returns the same schema.
 *
 * Published recipes are not editable here. The shelf holds only a reference to
 * those, and the catalog copy is the canonical one.
 */
function ShelfEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shelf, loading, shelveRecipe } = useShelf();

  if (loading) {
    return (
      <div className="shelf-edit-page section">
        <div className="container"><div className="skeleton-header" /></div>
      </div>
    );
  }

  const recipe = shelf.find(r => r.id === id);

  if (!recipe || recipe.status === 'published') {
    return (
      <div className="shelf-edit-page section">
        <div className="container">
          <h1>Nothing to edit</h1>
          <p className="shelf-edit-note">
            {recipe
              ? 'This recipe is already published, so the public copy is the real one.'
              : 'That recipe is not on your shelf.'}
          </p>
          <Link to="/shelf" className="btn btn-primary mt-4">Back to your shelf</Link>
        </div>
      </div>
    );
  }

  const handleSave = async (updated) => {
    // Keep the original id so the entry is replaced rather than duplicated;
    // the form derives a slug from the title, which may have changed.
    await shelveRecipe({ ...recipe, ...updated, id: recipe.id });
    navigate(`/shelf/${recipe.id}`);
  };

  return (
    <div className="shelf-edit-page section">
      <div className="container">
        <div className="shelf-edit-header">
          <h1>Edit draft</h1>
          <p className="shelf-edit-note">
            Only you can see this. Fix whatever the parser mangled before you publish it.
          </p>
        </div>

        <ManualRecipeForm
          initialData={recipe}
          onSave={handleSave}
          onCancel={() => navigate(`/shelf/${recipe.id}`)}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}

export default ShelfEdit;
