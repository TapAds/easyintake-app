"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavbarProps {
  logo?: React.ReactNode;
  logoHref?: string;
  navLinks?: NavLink[];
  ctaPrimary?: { href: string; label: string };
  locale?: string;
  localeSwitchHref?: (locale: string) => string;
  className?: string;
}

export function Navbar({
  logo,
  logoHref = "/",
  navLinks = [],
  ctaPrimary,
  locale = "en",
  localeSwitchHref = (l) => `/${l}`,
  className = "",
}: NavbarProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`flex items-center justify-between px-4 py-3 bg-background border-b border-foreground/10 ${className}`}
    >
      <div className="flex items-center gap-6">
        <Link href={logoHref} className="text-xl font-bold text-primary">
          {logo ?? "EasyIntake App"}
        </Link>
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={localeSwitchHref("en")}
            className={`px-2 py-1 rounded ${
              locale === "en" ? "bg-primary text-white" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            EN
          </Link>
          <Link
            href={localeSwitchHref("es")}
            className={`px-2 py-1 rounded ${
              locale === "es" ? "bg-primary text-white" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            ES
          </Link>
        </div>
        {ctaPrimary && (
          <Link
            href={ctaPrimary.href}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            {ctaPrimary.label}
          </Link>
        )}
      </div>
    </nav>
  );
}
