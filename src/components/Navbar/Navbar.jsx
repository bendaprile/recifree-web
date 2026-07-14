import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../LoginModal/LoginModal';
import { BookmarkIcon, CartIcon, PlusIcon } from '../Icons/Icons';
import RecifreeLogo from '../Icons/RecifreeLogo';

import './Navbar.css';

const HomeIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const InfoIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const UserIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNavSearch, setShowNavSearch] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { currentUser, logout, loadingAuth } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const stickySearchQuery = searchParams.get('q') || '';

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('q');
      setSearchParams(newParams, { replace: true });
    }
  };
  
  const handleSearchClear = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams, { replace: true });
  };
  const isHomePage = location.pathname === '/';

  // Smart hiding header and search bar triggers on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;

      // 1. Determine if the navbar search should be active
      if (isHomePage) {
        setShowNavSearch(currentScrollY > 280);
      } else {
        setShowNavSearch(false);
      }

      // 2. Smart header visibility logic: hide on scroll down, show on scroll up
      if (isMenuOpen) {
        setShowHeader(true);
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      if (currentScrollY <= 80) {
        // Always show header at the very top
        setShowHeader(true);
      } else {
        const scrollDifference = currentScrollY - lastScrollY;
        if (scrollDifference > 10) {
          // Scrolling down: hide header
          setShowHeader(false);
        } else if (scrollDifference < -10) {
          // Scrolling up: show header
          setShowHeader(true);
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderVisibility);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateHeaderVisibility();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage, isMenuOpen]);

  // Sync showHeader with parent sticky-header class
  useEffect(() => {
    const parentSticky = document.querySelector('.sticky-header');
    if (parentSticky) {
      if (showHeader) {
        parentSticky.classList.remove('sticky-header--hidden');
      } else {
        parentSticky.classList.add('sticky-header--hidden');
      }
    }
  }, [showHeader]);

  // Search filtering happens immediately via handleSearchChange

  // Close dropdown and mobile menu when navigating to another route
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [location]);

  // Close dropdown when clicking outside of the user menu container
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const closeUserMenu = () => {
    setIsDropdownOpen(false);
    closeMenu();
  };

  return (
    <>
      <header className={`navbar ${showHeader ? '' : 'navbar-hidden'}`}>
        <div className="container">
          <nav className="navbar-inner">
            <div className="navbar-left">
              <Link to="/" className="navbar-logo" onClick={closeMenu}>
                <RecifreeLogo size={28} />
                <h1 className="logo-text">Recifree</h1>
              </Link>

              {/* Desktop Navbar Search - left, fades in when active */}
              <div className={`navbar-search-left desktop-only ${showNavSearch && !isMobileSearchOpen ? 'visible' : ''}`} data-testid="sticky-search-bar">
                <div className="nav-search-wrapper">
                  <svg className="nav-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search recipes..."
                    value={stickySearchQuery}
                    onChange={handleSearchChange}
                    className="nav-search-input"
                  />
                  {stickySearchQuery && (
                    <button 
                      className="nav-search-clear"
                      onClick={handleSearchClear}
                      aria-label="Clear search"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Search Overlay - full width when active */}
            {isMobileSearchOpen && (
              <div className="navbar-mobile-search-overlay mobile-only">
                <div className="mobile-search-wrapper">
                  <svg className="nav-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={stickySearchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsMobileSearchOpen(false);
                      }
                    }}
                    className="mobile-search-input"
                    autoFocus
                  />
                  <button className="mobile-search-close" onClick={() => setIsMobileSearchOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Right side controls */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {showNavSearch && !isMobileSearchOpen && (
                <button 
                  className="mobile-search-trigger mobile-only"
                  onClick={() => setIsMobileSearchOpen(true)}
                  aria-label="Open search"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              )}

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
            </div>

            {/* Responsive Menu Navigation Container */}
            <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
              <ul className="navbar-links">
                <li>
                  <NavLink to="/" className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'} onClick={closeMenu}>
                    <HomeIcon size={16} />
                    <span>Home</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'} onClick={closeMenu}>
                    <InfoIcon size={16} />
                    <span>About</span>
                  </NavLink>
                </li>
                
                {loadingAuth ? (
                  <li>
                    <div className="nav-btn skeleton-text" style={{width: '90px', height: '36px'}} data-testid="navbar-skeleton" />
                  </li>
                ) : currentUser ? (
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
                      className="nav-btn user-menu-btn" 
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <UserIcon size={16} />
                      <span>My Kitchen ▾</span>
                    </button>
                    <div id="user-menu-popover" className={`user-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                      <NavLink to="/saved" className="dropdown-link" onClick={closeUserMenu}>
                        <BookmarkIcon size={16} />
                        <span>Saved Recipes</span>
                      </NavLink>
                      <NavLink to="/shopping-list" className="dropdown-link" onClick={closeUserMenu}>
                        <CartIcon size={16} />
                        <span>Shopping List</span>
                      </NavLink>
                      <NavLink to="/add" className="dropdown-link" onClick={closeUserMenu}>
                        <PlusIcon size={16} />
                        <span>Add Recipe</span>
                      </NavLink>
                      <hr className="dropdown-divider" />
                      <NavLink to="/settings" className="dropdown-link" onClick={closeUserMenu}>
                        <SettingsIcon size={16} />
                        <span>Settings</span>
                      </NavLink>
                      <button className="dropdown-link" onClick={() => { logout(); closeUserMenu(); }}>
                        <LogoutIcon size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </li>
                ) : (
                  <li>
                    <button className="nav-btn" onClick={() => { setShowLoginModal(true); closeMenu(); }}>
                      <UserIcon size={16} />
                      <span>Login</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu} data-testid="navbar-overlay"></div>}
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
          </nav>
        </div>
      </header>
    </>
  );
}

export default Navbar;
