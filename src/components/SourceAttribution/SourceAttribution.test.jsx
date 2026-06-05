import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SourceAttribution from './SourceAttribution';

describe('SourceAttribution Component', () => {
  it('renders null if no source is provided', () => {
    const { container } = render(<SourceAttribution source={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null if source url is missing', () => {
    const { container } = render(<SourceAttribution source={{ name: 'Test' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders attribution with extracted domain name when source name is missing', () => {
    const source = { url: 'https://www.bonappetit.com/recipe/lasagna' };
    render(<SourceAttribution source={source} />);

    expect(screen.getByText(/Recipe adapted from/)).toBeInTheDocument();
    expect(screen.getByText('bonappetit.com')).toBeInTheDocument();
    
    const link = screen.getByRole('link', { name: /View Original/ });
    expect(link).toHaveAttribute('href', 'https://www.bonappetit.com/recipe/lasagna');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders attribution with source name when provided', () => {
    const source = { name: 'Serious Eats', url: 'https://www.seriouseats.com/chili' };
    render(<SourceAttribution source={source} />);

    expect(screen.getByText(/Recipe adapted from/)).toBeInTheDocument();
    expect(screen.getByText('Serious Eats')).toBeInTheDocument();
  });
});
