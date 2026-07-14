import React from 'react';

/**
 * RecifreeLogo - Brand Logo Icon (Distilled Value Concept)
 * Renders a vector line-art funnel distilling a document into a clean, brand-colored leaf.
 * Highly responsive and automatically adapts to Light and Dark modes.
 */
export const RecifreeLogo = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`recifree-logo-icon ${className}`}
  >
    {/* Page / Document (Input Data) */}
    <path
      d="M8 2H13.5L16 4.5V9.5H8V2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    {/* Dog-ear fold detail on the document */}
    <path
      d="M13.5 2V4.5H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    {/* Lines on the document representing raw/cluttered data */}
    <line
      x1="10"
      y1="5"
      x2="12"
      y2="5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.6"
    />
    <line
      x1="10"
      y1="7"
      x2="14"
      y2="7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.6"
    />

    {/* The Distilling Funnel */}
    <path
      d="M4 9.5H20L14 15V18H10V15L4 9.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* The Refined/Distilled Leaf (Output Value) */}
    {/* Colored with the brand's primary color (Sage Green) with a subtle fill */}
    <path
      className="recifree-logo-leaf"
      d="M12 19C10.2 19 9.8 20.8 12 22.5C14.2 20.8 13.8 19 12 19Z"
      stroke="var(--color-primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="var(--color-primary)"
      fillOpacity="0.15"
    />
    {/* Leaf central vein */}
    <line
      className="recifree-logo-leaf-vein"
      x1="12"
      y1="19"
      x2="12"
      y2="22.5"
      stroke="var(--color-primary)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export default RecifreeLogo;
