import type { ReactNode } from "react";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  download?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export function LinkButton({
  href,
  children,
  variant = "primary",
  download = false,
  disabled = false,
  ariaLabel,
}: LinkButtonProps) {
  if (disabled) {
    return (
      <span className={`button button--${variant} button--disabled`} aria-disabled="true" title="Archivo pendiente de incorporar">
        {children}
      </span>
    );
  }

  return (
    <a className={`button button--${variant}`} href={href} download={download || undefined} aria-label={ariaLabel}>
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
