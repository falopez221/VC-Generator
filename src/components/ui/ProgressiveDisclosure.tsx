import type { ReactNode } from "react";

type DisclosureContent = ReactNode | readonly ReactNode[];

type ProgressiveDisclosureProps = {
  what: ReactNode;
  does: ReactNode;
  matters: ReactNode;
  how: DisclosureContent;
  technical: DisclosureContent;
  limitations: DisclosureContent;
};

function Content({ children }: { children: DisclosureContent }) {
  if (Array.isArray(children)) {
    return <ul>{children.map((item, index) => <li key={index}>{item}</li>)}</ul>;
  }
  return <p>{children}</p>;
}

export function ProgressiveDisclosure({ what, does, matters, how, technical, limitations }: ProgressiveDisclosureProps) {
  return (
    <div className="progressive-disclosure">
      <div className="progressive-summary">
        <article><span>WHAT IS IT?</span><p>{what}</p></article>
        <article><span>WHAT DOES IT DO?</span><p>{does}</p></article>
        <article><span>WHY DOES IT MATTER?</span><p>{matters}</p></article>
      </div>
      <div className="progressive-depth">
        <details><summary><span>04</span>How does it work?</summary><Content>{how}</Content></details>
        <details><summary><span>05</span>Technical details</summary><Content>{technical}</Content></details>
        <details><summary><span>06</span>Limitations</summary><Content>{limitations}</Content></details>
      </div>
    </div>
  );
}

