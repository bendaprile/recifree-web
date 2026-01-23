import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Recipe from './pages/Recipe/Recipe';
import './styles/global.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<Home />} />
            <Route path="/recipe/:id" element={<Recipe />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

// Simple About Page
function AboutPage() {
  return (
    <div className="about-page section">
      <div className="container">
        <div className="about-content">
          <h1>About Recifree</h1>
          <p className="lead">
            We believe recipes should be simple, accessible, and free from distractions.
          </p>

          <h2>Our Mission</h2>
          <p>
            Have you ever tried to find a recipe online, only to scroll through paragraphs
            of life stories about someone's grandmother's kitchen before finally reaching
            the ingredients list? We have too. That's why we created Recifree.
          </p>
          <p>
            Recifree is a 100% free, open-source recipe website that strips away the noise
            and presents recipes in their purest form: just ingredients and steps. No ads,
            no pop-ups, no premium subscriptions, no gimmicks.
          </p>

          <h2>How It Works</h2>
          <p>
            We curate recipes from across the web and distill them down to their essential
            components. Every recipe includes proper attribution to the original source,
            so you can explore further if you'd like.
          </p>

          <h2>Get Involved</h2>
          <p>
            Recifree is open source and community-driven. Whether you want to suggest
            recipes, contribute code, or just spread the word, we'd love to have you
            join our mission to make cooking accessible for everyone.
          </p>

          <div className="about-cta">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple 404 Page
function NotFoundPage() {
  return (
    <div className="not-found-page section">
      <div className="container text-center">
        <span className="not-found-emoji">🍳</span>
        <h1>404 - Page Not Found</h1>
        <p>Oops! This recipe seems to have gone missing.</p>
        <a href="/" className="btn btn-primary">Back to Home</a>
      </div>
    </div>
  );
}

export default App;
