import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../LoginModal/LoginModal';

import './Navbar.css';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { currentUser, logout, loadingAuth } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container">
        <nav className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <h1 className="logo-text">Recifree</h1>
          </Link>

          <button
            className={`navbar-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
            <ul className="navbar-links">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={closeMenu}
                >
                  Home
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={closeMenu}
                >
                  About
                </NavLink>
              </li>

              <li>
                {currentUser ? (
                  <NavLink
                    to="/saved"
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    onClick={closeMenu}
                  >
                    Saved
                  </NavLink>
                ) : (
                  <button
                    className="nav-link"
                    onClick={() => { setShowLoginModal(true); closeMenu(); }}
                    aria-label="Saved Recipes — log in required"
                  >
                    Saved
                  </button>
                )}
              </li>

              <li>
                {currentUser ? (
                  <NavLink
                    to="/shopping-list"
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    onClick={closeMenu}
                  >
                    Shopping List
                  </NavLink>
                ) : (
                  <button
                    className="nav-link"
                    onClick={() => { setShowLoginModal(true); closeMenu(); }}
                    aria-label="Shopping List — log in required"
                  >
                    Shopping List
                  </button>
                )}
              </li>

              {loadingAuth ? (
                <li>
                  <div className="nav-link skeleton-text" style={{width: '60px', height: '24px', display: 'inline-block', padding: '0'}} />
                </li>
              ) : currentUser ? (
                <>
                  <li>
                    <button className="nav-link" onClick={() => { logout(); closeMenu(); }}>
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <button className="nav-link" onClick={() => { setShowLoginModal(true); closeMenu(); }}>
                    Login
                  </button>
                </li>
              )}
            </ul>
          </div>

          {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu}></div>}
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
