import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as Icons from './Icons';

describe('Icons Component', () => {
    it('renders all icons without crashing', () => {
        Object.entries(Icons).forEach(([name, IconComponent]) => {
            const { container } = render(<IconComponent />);
            expect(container.querySelector('svg')).toBeInTheDocument();
        });
    });

    it('applies custom size and className props', () => {
        const { ClockIcon } = Icons;
        const { container } = render(<ClockIcon size={32} className="test-class" />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveAttribute('height', '32');
        expect(svg).toHaveClass('test-class');
    });
});
