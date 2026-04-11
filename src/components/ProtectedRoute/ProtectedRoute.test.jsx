import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const PrivatePage = () => <div>Private Content</div>;

const renderProtected = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <PrivatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('shows a loading spinner while auth is resolving', () => {
    useAuth.mockReturnValue({ currentUser: null, loadingAuth: true });
    renderProtected();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
  });

  it('redirects to "/" when the user is not authenticated', () => {
    useAuth.mockReturnValue({ currentUser: null, loadingAuth: false });
    renderProtected();
    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when the user is authenticated', () => {
    useAuth.mockReturnValue({ currentUser: { uid: '123' }, loadingAuth: false });
    renderProtected();
    expect(screen.getByText('Private Content')).toBeInTheDocument();
  });
});
