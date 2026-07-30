import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSavedRecipes } from '../../context/SavedRecipesContext';
import LoginModal from '../LoginModal/LoginModal';
import { PlusIcon } from '../Icons/Icons';

import './Navbar.css';

const UserIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SearchIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const ChevronIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Flow height the sticky header gives up when it condenses (80px -> 64px).
// Scroll anchoring hands this back as a scrollY correction, so the collapse and
// expand thresholds must sit further apart than this to stay stable.
const NAVBAR_HEIGHT_SHIFT = 16;
const COLLAPSE_BELOW_SCROLL_Y = 64;
const EXPAND_ABOVE_SCROLL_Y = COLLAPSE_BELOW_SCROLL_Y - NAVBAR_HEIGHT_SHIFT * 2.5; // 24

/** Derive up to two uppercase initials from a display name or email for the avatar tile. */
function getUserInitials(user) {
  const source = user?.displayName || user?.email || '';
  const parts = source.split('@')[0].split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'RF';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { currentUser, logout, loadingAuth } = useAuth();
  // Rendered outside SavedRecipesProvider in unit tests, so read defensively.
  const savedCount = useSavedRecipes()?.savedRecipes?.length ?? 0;

  const location = useLocation();
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

  // The search affordance rides the morph: it appears with the condensed 2D rail.
  // Home-only, since the ?q= param is what the home grid filters on.
  const showNavSearch = isHomePage && isScrolled;

  // 2A -> 2D scroll-morphing transition. The bar always stays put; only its
  // proportions change, so there is no show/hide bookkeeping here.
  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const y = window.scrollY;
      // Hysteresis, not a single threshold. Condensing removes NAVBAR_HEIGHT_SHIFT
      // of flow height, and the browser's scroll anchoring compensates by pulling
      // scrollY back by that much. With one threshold the correction lands on the
      // far side of it, re-expanding the bar, which pushes scrollY back again —
      // a rapid oscillation for anyone stopping near the boundary. The dead band
      // between these two values is wider than the shift, so the state settles.
      setIsScrolled((wasScrolled) =>
        wasScrolled ? y > EXPAND_ABOVE_SCROLL_Y : y > COLLAPSE_BELOW_SCROLL_Y
      );
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        // Latch before scheduling: if the frame callback runs synchronously,
        // setting the flag afterwards would leave it stuck on forever.
        ticking = true;
        window.requestAnimationFrame(updateScrollState);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollState();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Collapse the search field again whenever the trigger itself goes away.
  // Adjusted during render (React's "adjusting state when a prop changes"
  // pattern) rather than in an effect, so it doesn't cost an extra render pass.
  const [prevShowNavSearch, setPrevShowNavSearch] = useState(showNavSearch);
  if (showNavSearch !== prevShowNavSearch) {
    setPrevShowNavSearch(showNavSearch);
    if (!showNavSearch) setIsSearchOpen(false);
  }

  // Dismiss the menus on navigation. Keyed on pathname, not the whole location:
  // the search field writes to ?q=, which changes location on every keystroke
  // and would otherwise close the mobile search overlay as soon as it is used.
  // Adjusted during render for the same reason as above - no extra render pass.
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // The icon expands in place into a field, and focus follows it open.
  const toggleNavSearch = () => {
    const next = !isSearchOpen;
    setIsSearchOpen(next);
    if (next) {
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const closeUserMenu = () => {
    setIsDropdownOpen(false);
    closeMenu();
  };

  return (
    <>
      <header className={`navbar ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="container">
          <nav className="navbar-inner">

            {/* Center Section: Editorial Serif Brand Logo & Subtext (2A -> 2D Morphing) */}
            <div className="navbar-center">
              <Link to="/" className="navbar-logo" onClick={closeMenu}>
                <div className="logo-brand-wrap">
                  <span className="logo-text">Recifree</span>
                  <span className="logo-tagline">Recipes, Refined</span>
                </div>
              </Link>
            </div>

            {/* Mobile Search Overlay - full width when active */}
            {isMobileSearchOpen && (
              <div className="navbar-mobile-search-overlay mobile-only">
                <div className="mobile-search-wrapper">
                  <SearchIcon size={14} className="nav-search-icon" />
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

            {/* Right Action Cluster: Mobile Trigger & Hamburger */}
            <div className="navbar-right-tools mobile-only">
              {showNavSearch && !isMobileSearchOpen && (
                <button 
                  className="mobile-search-trigger mobile-only"
                  onClick={() => setIsMobileSearchOpen(true)}
                  aria-label="Open search"
                >
                  <SearchIcon size={18} />
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

            {/* Main Unified Navigation Menu.
                Desktop: `display: contents` so the two clusters sit directly in the
                navbar grid (col 1 and col 3, flanking the centred brand).
                Mobile: a single slide-in drawer holding both clusters. */}
            <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>

              {/* Left cluster: primary destinations, set as plain editorial text.
                  Saved and Shopping List are behind ProtectedRoute, so they only
                  appear once there is somewhere for them to lead. */}
              <ul className="navbar-links navbar-cluster navbar-cluster--start">
                <li>
                  <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'} onClick={closeMenu}>
                    Explore
                  </NavLink>
                </li>
                {currentUser && (
                  <>
                    <li>
                      <NavLink to="/saved" className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'} onClick={closeMenu}>
                        Saved
                        {savedCount > 0 && <span className="nav-count-badge">{savedCount}</span>}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/shopping-list" className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'} onClick={closeMenu}>
                        Shopping List
                      </NavLink>
                    </li>
                  </>
                )}
              </ul>

              {/* Right cluster: search trigger + account pill + primary Extract CTA */}
              <ul className="navbar-links navbar-cluster navbar-cluster--end">

                {/* Search: a 36px icon button that expands in place into a field.
                    Fades in with the condensed 2D rail, mirroring the concept. */}
                <li className="nav-search-item desktop-only">
                  <div
                    className={`nav-search ${showNavSearch ? 'is-visible' : ''} ${isSearchOpen ? 'is-open' : ''}`}
                    data-testid="sticky-search-bar"
                  >
                    <button
                      type="button"
                      className="nav-search-toggle"
                      onClick={toggleNavSearch}
                      aria-label={isSearchOpen ? 'Close search' : 'Search recipes'}
                      aria-expanded={isSearchOpen}
                      tabIndex={showNavSearch ? 0 : -1}
                    >
                      <SearchIcon size={16} />
                    </button>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search recipes..."
                      value={stickySearchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={(e) => { if (e.key === 'Escape') setIsSearchOpen(false); }}
                      className="nav-search-input"
                      tabIndex={isSearchOpen ? 0 : -1}
                    />
                    {isSearchOpen && stickySearchQuery && (
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
                      <span className="nav-user-avatar" aria-hidden="true">{getUserInitials(currentUser)}</span>
                      <span>My Kitchen</span>
                      <ChevronIcon size={13} className="nav-user-caret" />
                    </button>
                    <div id="user-menu-popover" className={`user-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                      <NavLink to="/settings" className="dropdown-link" onClick={closeUserMenu}>
                        <SettingsIcon size={16} />
                        <span>Settings</span>
                      </NavLink>
                      <hr className="dropdown-divider" />
                      <button className="dropdown-link" onClick={() => { logout(); closeUserMenu(); }}>
                        <LogoutIcon size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </li>
                ) : (
                  <li>
                    <button className="nav-btn" onClick={() => { setShowLoginModal(true); closeMenu(); }}>
                      <UserIcon size={15} />
                      <span>Login</span>
                    </button>
                  </li>
                )}

                <li className="extract-cta-item">
                  <Link to="/add" className="nav-extract-btn" onClick={closeMenu}>
                    <PlusIcon size={15} />
                    <span>Extract Recipe</span>
                  </Link>
                </li>
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
