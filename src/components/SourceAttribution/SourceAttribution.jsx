import './SourceAttribution.css';

function SourceAttribution({ source }) {
  if (!source || !source.url) return null;

  // Extract hostname for cleaner presentation
  let domain = '';
  try {
    domain = new URL(source.url).hostname.replace('www.', '');
  } catch {
    domain = source.name || 'Original Source';
  }

  return (
    <div className="recipe-source">
      <p>
        Recipe adapted from{' '}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          {source.name || domain} ↗
        </a>
      </p>
    </div>
  );
}

export default SourceAttribution;
