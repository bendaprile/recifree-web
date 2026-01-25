import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <span className="logo-icon">🍳</span>
                            <span className="logo-text">Recifree</span>
                        </Link>
                        <p className="footer-tagline">
                            Recipes without the clutter. Just ingredients, steps, and deliciousness.
                        </p>
                    </div>

                    <div className="footer-links">
                        <div className="footer-section">
                            <h4 className="footer-heading">Navigate</h4>
                            <ul>
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/about">About</Link></li>
                            </ul>
                        </div>

                        <div className="footer-section">
                            <h4 className="footer-heading">Legal</h4>
                            <ul>
                                <li><Link to="/privacy">Privacy Policy</Link></li>
                                <li><Link to="/dmca">DMCA Policy</Link></li>
                            </ul>
                        </div>

                        <div className="footer-section">
                            <h4 className="footer-heading">Connect</h4>
                            <ul>
                                <li>
                                    <a
                                        href="https://github.com/bendaprile/recifree-web"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        GitHub
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {currentYear} Recifree. Made with ❤️ for home cooks everywhere.</p>
                    <p className="footer-note">
                        100% free, open source, and ad-free. Forever.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
