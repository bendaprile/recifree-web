import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Recipe from './pages/Recipe/Recipe';
import ShoppingList from './pages/ShoppingList/ShoppingList';
import { ShoppingListProvider } from './context/ShoppingListContext';
import './styles/global.css';
import './App.css';

function App() {
  return (
    <ShoppingListProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/recipe/:id" element={<Recipe />} />
              <Route path="/shopping-list" element={<ShoppingList />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/dmca" element={<DMCAPolicyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ShoppingListProvider>
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

          <div className="about-cta">
            <a href="https://github.com/bendaprile/recifree-web" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
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

// Privacy Policy Page
function PrivacyPolicyPage() {
  return (
    <div className="legal-page section">
      <div className="container">
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: January 25, 2026</p>

          <p className="lead">
            Recifree is committed to protecting your privacy. This policy explains what information
            we collect, how we use it, and your rights regarding your data.
          </p>

          <h2>1. Who We Are</h2>
          <p>
            Recifree is a free, open-source recipe website operated as a non-commercial project.
            We provide curated recipes with proper attribution to original sources.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>Information We Do NOT Collect</h3>
          <ul>
            <li><strong>No Account Data:</strong> We do not require user registration or login. We do not collect names, email addresses, passwords, or any personal identifiers.</li>
            <li><strong>No Payment Information:</strong> We do not process payments or collect financial data.</li>
            <li><strong>No User-Generated Content:</strong> We do not accept user submissions that would require collecting personal information.</li>
          </ul>

          <h3>Information Automatically Collected</h3>
          <p>When you visit our website, standard technical information may be collected:</p>
          <ul>
            <li><strong>Server Logs:</strong> IP address, browser type, operating system, referring URLs, pages visited, and timestamps. This data is collected by our hosting provider for security and operational purposes.</li>
            <li><strong>Analytics Data:</strong> We may use privacy-focused analytics to understand traffic patterns. This data is aggregated and anonymized.</li>
          </ul>

          <h2>3. Cookies and Tracking</h2>
          <h3>Essential Cookies</h3>
          <p>We may use minimal essential cookies required for basic site functionality (e.g., remembering preferences).</p>

          <h3>Analytics</h3>
          <p>
            If we use analytics services, they are configured to respect your privacy. We do not use
            advertising cookies or allow third-party ad tracking on our site.
          </p>

          <h3>Your Choices</h3>
          <p>
            You can disable cookies through your browser settings. Most features of Recifree will
            continue to work without cookies.
          </p>

          <h2>4. How We Use Information</h2>
          <p>Any technical data we collect is used solely for:</p>
          <ul>
            <li>Ensuring site security and preventing abuse</li>
            <li>Understanding general traffic patterns to improve the site</li>
            <li>Debugging technical issues</li>
          </ul>
          <p>
            <strong>We do not:</strong> Sell your data, use it for advertising, create user profiles,
            or share it with third parties for marketing purposes.
          </p>

          <h2>5. Third-Party Services</h2>
          <p>Our website may use the following third-party services:</p>
          <ul>
            <li><strong>Hosting Provider:</strong> Our site is hosted on third-party infrastructure that may collect server logs according to their own privacy policies.</li>
            <li><strong>Content Delivery Networks (CDN):</strong> We may use CDN services to deliver content faster, which may process IP addresses.</li>
            <li><strong>GitHub:</strong> Our source code is hosted on GitHub. Links to our repository are governed by GitHub's privacy policy.</li>
          </ul>

          <h2>6. Data Retention</h2>
          <p>
            Server logs are typically retained for a limited period (usually 30-90 days) for security
            purposes before being automatically deleted. Analytics data, if collected, is aggregated
            and does not identify individual users.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li><strong>Right to Access:</strong> Request information about data we may hold about you.</li>
            <li><strong>Right to Deletion:</strong> Request deletion of any personal data.</li>
            <li><strong>Right to Object:</strong> Object to certain types of data processing.</li>
            <li><strong>Right to Portability:</strong> Receive your data in a portable format.</li>
          </ul>
          <p>
            Since we collect minimal data and do not maintain user accounts, these rights may have
            limited applicability. To exercise any rights, contact us via our GitHub repository.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            Recifree is a general-audience website about cooking. We do not knowingly collect personal
            information from children under 13 years of age. Since we do not require registration or
            collect personal data, there is no mechanism through which children's data would be collected.
          </p>

          <h2>9. International Users</h2>
          <p>
            Recifree may be accessed from around the world. By using our site, you understand that
            any minimal technical data collected may be processed in the country where our servers
            are located. We aim to comply with applicable privacy laws including GDPR and CCPA.
          </p>

          <h2>10. Security</h2>
          <p>
            We implement reasonable security measures to protect the limited data we process. As an
            open-source project, our code is publicly auditable. However, no internet transmission
            is completely secure.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be indicated
            by updating the "Last Updated" date. Continued use of the site after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights, please open an issue on our
            GitHub repository or contact us through the channels listed there.
          </p>

          <div className="legal-cta">
            <a href="https://github.com/bendaprile/recifree-web" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Contact via GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// DMCA Policy Page
function DMCAPolicyPage() {
  return (
    <div className="legal-page section">
      <div className="container">
        <div className="legal-content">
          <h1>DMCA Policy</h1>
          <p className="legal-updated">Last Updated: January 25, 2026</p>

          <p className="lead">
            Recifree respects the intellectual property rights of others and expects users of our
            service to do the same. This policy outlines our procedures for addressing copyright
            infringement claims in accordance with the Digital Millennium Copyright Act (DMCA).
          </p>

          <h2>1. Our Commitment to Intellectual Property</h2>
          <p>
            Recifree is committed to respecting the intellectual property rights of content creators.
            We comply with the provisions of the Digital Millennium Copyright Act (17 U.S.C. § 512)
            and respond promptly to valid takedown notices.
          </p>

          <h2>2. How We Handle Recipe Content</h2>
          <h3>Our Attribution Model</h3>
          <p>
            Recifree curates recipes from across the web and presents them in a simplified format.
            For every recipe on our site:
          </p>
          <ul>
            <li>We provide clear attribution to the original source</li>
            <li>We link directly to the original recipe page</li>
            <li>We present only the essential factual elements: ingredients and preparation steps</li>
          </ul>

          <h3>Legal Background on Recipes</h3>
          <p>
            Under U.S. copyright law, recipes present a unique situation. The U.S. Copyright Office
            has stated that "mere listings of ingredients as in recipes... are not subject to copyright
            protection." However, substantial literary expression that accompanies a recipe—such as
            personal stories, detailed explanations, or creative descriptions—may be protected.
          </p>
          <p>
            Recifree specifically extracts and presents only the factual components (ingredients and
            basic instructions) while linking to original sources where users can find the full
            creative expression. Despite this legal framework, we take all copyright concerns seriously
            and will respond to valid takedown requests.
          </p>

          <h2>3. Filing a DMCA Takedown Notice</h2>
          <p>
            If you believe that content on Recifree infringes your copyright, you may submit a
            DMCA takedown notice. To be valid, your notice must include:
          </p>
          <ol>
            <li>
              <strong>Your Signature:</strong> A physical or electronic signature of the copyright
              owner or a person authorized to act on their behalf.
            </li>
            <li>
              <strong>Identification of the Work:</strong> Identification of the copyrighted work
              you claim has been infringed. If multiple works are involved, provide a representative list.
            </li>
            <li>
              <strong>Identification of Infringing Material:</strong> Identification of the material
              you claim is infringing, including the specific URL(s) where it appears on our site.
            </li>
            <li>
              <strong>Your Contact Information:</strong> Your address, telephone number, and email address.
            </li>
            <li>
              <strong>Good Faith Statement:</strong> A statement that you have a good faith belief
              that the use of the material is not authorized by the copyright owner, its agent, or the law.
            </li>
            <li>
              <strong>Accuracy Statement:</strong> A statement, made under penalty of perjury, that
              the information in your notice is accurate and that you are the copyright owner or
              authorized to act on the owner's behalf.
            </li>
          </ol>

          <h2>4. Where to Send DMCA Notices</h2>
          <p>
            Please submit DMCA takedown notices by opening an issue on our GitHub repository or
            contacting us through the channels listed there. Include "DMCA Takedown Notice" in the
            subject line.
          </p>
          <div className="legal-contact-box">
            <p><strong>Designated DMCA Agent:</strong></p>
            <p>
              DMCA notices can be submitted via our{' '}
              <a href="https://github.com/bendaprile/recifree-web/issues" target="_blank" rel="noopener noreferrer">
                GitHub Issues page
              </a>
            </p>
          </div>

          <h2>5. Counter-Notification Process</h2>
          <p>
            If you believe your content was removed by mistake or misidentification, you may file
            a counter-notification. Your counter-notice must include:
          </p>
          <ol>
            <li>Your physical or electronic signature</li>
            <li>Identification of the material that was removed and its prior location</li>
            <li>
              A statement under penalty of perjury that you have a good faith belief the material
              was removed due to mistake or misidentification
            </li>
            <li>Your name, address, and telephone number</li>
            <li>
              A statement consenting to the jurisdiction of the federal court in your district
              (or if outside the U.S., any judicial district where we may be found)
            </li>
            <li>
              A statement that you will accept service of process from the person who filed the
              original DMCA notice
            </li>
          </ol>
          <p>
            Upon receiving a valid counter-notification, we will forward it to the original
            complainant. If the complainant does not notify us within 10-14 business days that
            they have filed a court action, we may restore the removed content.
          </p>

          <h2>6. Repeat Infringer Policy</h2>
          <p>
            In accordance with the DMCA, Recifree maintains a policy to terminate access for users
            or contributors who are repeat infringers. We track infringement claims and take
            appropriate action against repeat offenders, which may include:
          </p>
          <ul>
            <li>Permanent removal of infringing content</li>
            <li>Blocking of repeat infringer contributions</li>
            <li>Termination of any applicable accounts or access</li>
          </ul>

          <h2>7. Misrepresentation Warning</h2>
          <p>
            Please be aware that under Section 512(f) of the DMCA, any person who knowingly
            materially misrepresents that material is infringing, or that it was removed by
            mistake, may be subject to liability for damages, including costs and attorneys' fees.
          </p>
          <p>
            <strong>Before filing a DMCA notice,</strong> please consider whether the use of the
            material may constitute fair use or whether the specific elements copied are actually
            protected by copyright.
          </p>

          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify this DMCA Policy at any time. Changes will be effective
            immediately upon posting to this page with an updated "Last Updated" date.
          </p>

          <h2>9. Questions</h2>
          <p>
            If you have questions about this policy or our copyright practices, please contact us
            through our GitHub repository.
          </p>

          <div className="legal-cta">
            <a href="https://github.com/bendaprile/recifree-web" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Contact via GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
