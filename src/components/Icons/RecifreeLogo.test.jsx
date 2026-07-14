import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecifreeLogo from './RecifreeLogo';

describe('RecifreeLogo Component', () => {
  it('renders the logo without crashing', () => {
    const { container } = render(<RecifreeLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom size prop', () => {
    const { container } = render(<RecifreeLogo size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('applies custom className and contains base logo class', () => {
    const { container } = render(<RecifreeLogo className="custom-test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('recifree-logo-icon');
    expect(svg).toHaveClass('custom-test-class');
  });

  it('contains the animated leaf elements with correct styling attributes', () => {
    const { container } = render(<RecifreeLogo />);
    const leaf = container.querySelector('.recifree-logo-leaf');
    const leafVein = container.querySelector('.recifree-logo-leaf-vein');
    
    expect(leaf).toBeInTheDocument();
    expect(leafVein).toBeInTheDocument();
    expect(leaf).toHaveAttribute('stroke', 'var(--color-primary)');
    expect(leaf).toHaveAttribute('fill', 'var(--color-primary)');
    expect(leafVein).toHaveAttribute('stroke', 'var(--color-primary)');
  });
});
