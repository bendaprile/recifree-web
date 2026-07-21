import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExtractionCard from './ExtractionCard';

describe('ExtractionCard Component', () => {
  it('renders correctly with placeholder and button', () => {
    render(<ExtractionCard onExtract={vi.fn()} isLoading={false} error="" />);
    expect(screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strip the Fluff' })).toBeInTheDocument();
  });

  it('displays validation error if URL is empty on submit', () => {
    const { container } = render(<ExtractionCard onExtract={vi.fn()} isLoading={false} error="" />);
    
    const form = container.querySelector('form');
    form.setAttribute('novalidate', 'true');

    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please enter a recipe URL.')).toBeInTheDocument();
  });

  it('displays validation error if URL format is invalid', () => {
    const { container } = render(<ExtractionCard onExtract={vi.fn()} isLoading={false} error="" />);
    
    const form = container.querySelector('form');
    form.setAttribute('novalidate', 'true');

    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please enter a valid URL (e.g. https://example.com/recipe).')).toBeInTheDocument();
  });

  it('displays validation error if protocol is not http or https', () => {
    const { container } = render(<ExtractionCard onExtract={vi.fn()} isLoading={false} error="" />);
    
    const form = container.querySelector('form');
    form.setAttribute('novalidate', 'true');

    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    fireEvent.change(input, { target: { value: 'ftp://example.com/recipe' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Invalid protocol. Only http:// and https:// URLs are supported.')).toBeInTheDocument();
  });

  it('calls onExtract callback on submit with a valid URL', () => {
    const mockOnExtract = vi.fn();
    render(<ExtractionCard onExtract={mockOnExtract} isLoading={false} error="" />);
    
    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Strip the Fluff' });

    fireEvent.change(input, { target: { value: 'https://example.com/recipe/soup' } });
    fireEvent.click(submitBtn);

    expect(mockOnExtract).toHaveBeenCalledWith('https://example.com/recipe/soup');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays external error passed via props', () => {
    render(<ExtractionCard onExtract={vi.fn()} isLoading={false} error="Failed to fetch recipe from server" />);
    expect(screen.getByText('Failed to fetch recipe from server')).toBeInTheDocument();
  });

  it('disables input and button when isLoading is true', () => {
    render(<ExtractionCard onExtract={vi.fn()} isLoading={true} error="" />);
    
    const input = screen.getByPlaceholderText(/e.g. https:\/\/www.bonappetit.com/);
    const submitBtn = screen.getByRole('button', { name: 'Processing...' });

    expect(input).toBeDisabled();
    expect(submitBtn).toBeDisabled();
  });
});
