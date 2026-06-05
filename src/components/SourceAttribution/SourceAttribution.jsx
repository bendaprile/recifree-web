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
    <div className="source-attribution-card">
      <div className="source-attribution-content">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="source-attribution-icon"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <div className="source-attribution-text-group">
          <span className="source-attribution-label">Original Source</span>
          <p className="source-attribution-adapted">
            Recipe adapted from <strong className="source-publisher">{source.name || domain}</strong>
          </p>
        </div>
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary source-attribution-btn"
      >
        View Original ↗
      </a>
    </div>
  );
}

export default SourceAttribution;
