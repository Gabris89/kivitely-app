import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children ? <div className="header-actions">{children}</div> : null}
    </header>
  );
}

export function HeaderLink({ href, children, variant = "ghost" }: { href: string; children: ReactNode; variant?: "ghost" | "primary" }) {
  return (
    <Link href={href} className={`button ${variant}`}>
      {children}
    </Link>
  );
}
