import { FOOTER_TEXT, NAVIGATION, PROJECT_NAME, SITE_LINKS } from "@/src/config/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-brand">{PROJECT_NAME}</p>
          <p className="footer-note">{FOOTER_TEXT}</p>
        </div>
        <div className="footer-links" aria-label="Enlaces del pie">
          {NAVIGATION.slice(0, 6).map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
        </div>
        <div className="footer-links">
          <a href={SITE_LINKS.email}>Email</a>
          <a href={SITE_LINKS.linkedin}>LinkedIn</a>
          <a href={SITE_LINKS.github}>GitHub</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Documento conceptual · 2026</span>
        <a href="#vision">Volver arriba ↑</a>
      </div>
    </footer>
  );
}
