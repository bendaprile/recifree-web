import { useState, useEffect } from 'react';
import './MascotLoader.css';

const WITTY_PHRASES = [
  "Tossing out the 12-paragraph life story...",
  "Sifting out pop-ups and tracking scripts...",
  "Gathering only the tasty facts, skipping the fluff...",
  "Plating the instructions...",
  "Running the AI sous-chef...",
  "Polishing the measurements...",
  "Stretching the dough, letting it rise...",
  "Whipping up a custom AI illustration..."
];

function MascotLoader() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prevIndex) => (prevIndex + 1) % WITTY_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mascot-loader" role="status" aria-label="Extracting recipe">
      <div className="mascot-animation-container">
        {/* Sleek SVG Blender Mascot */}
        <svg
          viewBox="0 0 150 200"
          className="mascot-blender-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Jar Lid */}
          <path
            d="M 50 40 L 100 40 L 95 30 L 55 30 Z"
            fill="var(--charcoal-deep, #1e293b)"
            className="blender-lid"
          />
          <rect
            x="70"
            y="25"
            width="10"
            height="5"
            rx="2"
            fill="var(--charcoal-deep, #1e293b)"
          />

          {/* Glass Jar Body */}
          <path
            d="M 50 40 L 40 140 A 10 10 0 0 0 50 150 L 100 150 A 10 10 0 0 0 110 140 L 100 40 Z"
            fill="rgba(255, 255, 255, 0.15)"
            stroke="var(--charcoal-deep, #1e293b)"
            strokeWidth="3.5"
            className="blender-jar"
          />

          {/* Measurement Markings */}
          <line x1="90" y1="60" x2="98" y2="60" stroke="var(--charcoal-deep, #1e293b)" strokeWidth="2.5" opacity="0.5" />
          <line x1="88" y1="85" x2="98" y2="85" stroke="var(--charcoal-deep, #1e293b)" strokeWidth="2.5" opacity="0.5" />
          <line x1="90" y1="110" x2="98" y2="110" stroke="var(--charcoal-deep, #1e293b)" strokeWidth="2.5" opacity="0.5" />
          <line x1="88" y1="135" x2="98" y2="135" stroke="var(--charcoal-deep, #1e293b)" strokeWidth="2.5" opacity="0.5" />

          {/* Blender Blade Shaft */}
          <rect
            x="72"
            y="130"
            width="6"
            height="20"
            fill="var(--charcoal-deep, #1e293b)"
          />

          {/* Spinning Blade inside Jar */}
          <g className="blender-blade-group">
            <path
              d="M 60 135 C 60 135, 75 130, 90 135 C 90 135, 75 140, 60 135"
              fill="#94a3b8"
              stroke="var(--charcoal-deep, #1e293b)"
              strokeWidth="2"
              className="blender-blade"
            />
            <circle cx="75" cy="135" r="4" fill="var(--charcoal-deep, #1e293b)" />
          </g>

          {/* Blender base collar */}
          <path
            d="M 45 150 L 105 150 L 100 160 L 50 160 Z"
            fill="var(--charcoal-deep, #1e293b)"
          />

          {/* Motor Base (Safety Orange or Charcoal) */}
          <path
            d="M 45 160 L 35 200 H 115 L 105 160 Z"
            fill="var(--color-primary, #ff7a00)"
            stroke="var(--charcoal-deep, #1e293b)"
            strokeWidth="3.5"
            className="blender-base"
          />

          {/* Control Dial */}
          <circle
            cx="75"
            cy="180"
            r="10"
            fill="var(--color-bg, #fffdfa)"
            stroke="var(--charcoal-deep, #1e293b)"
            strokeWidth="2.5"
          />
          <line
            x1="75"
            y1="180"
            x2="75"
            y2="173"
            stroke="var(--charcoal-deep, #1e293b)"
            strokeWidth="3"
            strokeLinecap="round"
            className="blender-dial-hand"
          />

          {/* Small Status Light */}
          <circle cx="95" cy="180" r="3" fill="#10b981" className="blender-status-led" />

          {/* Whirling Fluff Particles (Gray boxes / text blocks being blended) */}
          <g className="blender-fluff-particles">
            {/* Gray box */}
            <rect x="52" y="70" width="12" height="6" rx="1" fill="#cbd5e1" opacity="0.6" className="fluff-block-1" />
            {/* Gray text lines */}
            <line x1="55" y1="95" x2="70" y2="95" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" className="fluff-block-2" />
            <line x1="50" y1="110" x2="62" y2="110" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" className="fluff-block-3" />
            {/* Tiny stars or sparklers */}
            <path d="M 85 70 L 87 74 L 91 75 L 87 76 L 85 80 L 83 76 L 79 75 L 83 74 Z" fill="var(--color-primary, #ff7a00)" className="star-particle" />
            <circle cx="65" cy="55" r="2.5" fill="var(--color-primary, #ff7a00)" className="bubble-particle-1" />
            <circle cx="80" cy="100" r="1.5" fill="var(--color-primary, #ff7a00)" className="bubble-particle-2" />
          </g>
        </svg>

        {/* Pulse / Whirling Rings beneath the blender */}
        <div className="whirl-ring-1"></div>
        <div className="whirl-ring-2"></div>
      </div>

      <div className="mascot-text-container">
        <p className="mascot-loading-title">Stripping the Fluff...</p>
        <p className="mascot-loading-phrase">{WITTY_PHRASES[phraseIndex]}</p>
      </div>
    </div>
  );
}

export default MascotLoader;
