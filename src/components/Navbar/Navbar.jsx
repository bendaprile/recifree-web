import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../LoginModal/LoginModal';

import './Navbar.css';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { currentUser, logout, loadingAuth } = useAuth();
  
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Close dropdown and mobile menu when navigating to another route
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, [location]);

  // Close dropdown when clicking outside of the user menu container
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const closeUserMenu = () => {
    setIsDropdownOpen(false);
    closeMenu();
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
                <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>Home</NavLink>
              </li>
              <li>
                <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>About</NavLink>
              </li>
              
              {loadingAuth ? (
                <li>
                  <div className="nav-link skeleton-text" style={{width: '60px', height: '24px', display: 'inline-block', padding: '0'}} data-testid="navbar-skeleton" />
                </li>
              ) : currentUser ? (
                <>
                  <li>
                    <NavLink to="/add" className={({ isActive }) => isActive ? 'nav-link active add-recipe-btn' : 'nav-link add-recipe-btn'} onClick={closeMenu}>+ Add Recipe</NavLink>
                  </li>
                  <li 
                    ref={dropdownRef}
                    className="user-menu-container"
                    onMouseEnter={() => setIsDropdownOpen(true)}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsDropdownOpen(false);
                      }
                    }}
                  >
                    <button 
                      className="nav-link user-menu-btn" 
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      My Kitchen ▾
                    </button>
                    <div id="user-menu-popover" className={`user-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                      <NavLink to="/saved" className="dropdown-link" onClick={closeUserMenu}>Saved Recipes</NavLink>
                      <NavLink to="/shopping-list" className="dropdown-link" onClick={closeUserMenu}>Shopping List</NavLink>
                      <NavLink to="/settings" className="dropdown-link" onClick={closeUserMenu}>Settings</NavLink>
                      <button className="dropdown-link text-left" onClick={() => { logout(); closeUserMenu(); }}>Logout</button>
                    </div>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button className="nav-link add-recipe-btn" onClick={() => { setShowLoginModal(true); closeMenu(); }}>+ Add Recipe</button>
                  </li>
                  <li>
                    <button className="nav-link" onClick={() => { setShowLoginModal(true); closeMenu(); }}>Login</button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu} data-testid="navbar-overlay"></div>}
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
