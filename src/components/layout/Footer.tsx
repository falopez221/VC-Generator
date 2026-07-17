import Link from "next/link";
import {
  CONTACT_EMAIL,
  FOOTER_NAVIGATION,
  FOOTER_TEXT,
  PROJECT_NAME,
  SITE_LINKS,
} from "@/src/config/site";

export function Footer() {
  return (
    <footer className="site-footer" lang="en">
      <div className="container footer-lead">
        <div>
          <span className="footer-index">VENTURE GOVERNANCE / PUBLIC SYSTEM</span>
          <h2>Explore broadly.<br />Decide deliberately.</h2>
        </div>
        <div className="footer-boundary">
          <span>OPERATING BOUNDARY</span>
          <p>AI expands the search space and models uncertainty. A named person retains authority, accountability and the final decision.</p>
          <Link href={SITE_LINKS.demo}>Run the Public Lab <span aria-hidden="true">→</span></Link>
        </div>
      </div>

      <div className="container footer-directory">
        <div className="footer-identity">
          <Link className="footer-brand" href="/">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>{PROJECT_NAME}</span>
          </Link>
          <p lang="es">{FOOTER_TEXT}</p>
          <a href={SITE_LINKS.email}>{CONTACT_EMAIL}</a>
        </div>
        {FOOTER_NAVIGATION.map((group) => (
          <nav className="footer-links" aria-label={group.label} key={group.label}>
            <h3>{group.label}</h3>
            {group.links.map((item) => <Link href={item.href} key={item.label}>{item.label}</Link>)}
          </nav>
        ))}
      </div>

      <div className="container footer-bottom">
        <span>Venture Governance System™ · Conceptual decision-support system · 2026</span>
        <span>Synthetic public demo · No financial advice · <a href="https://www.scottbuckley.com.au/library/the-vision/" target="_blank" rel="noreferrer">“The Vision” by Scott Buckley · CC BY 4.0</a></span>
        <Link href="/#vision">Back to top ↑</Link>
      </div>
    </footer>
  );
}
