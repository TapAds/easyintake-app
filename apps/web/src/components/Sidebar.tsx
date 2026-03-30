"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  logo?: React.ReactNode;
  logoHref?: string;
  navItems?: NavItem[];
  className?: string;
}

export function Sidebar({
  logo,
  logoHref = "/",
  navItems = [],
  className = "",
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col w-64 min-h-screen bg-background border-r border-foreground/10 ${className}`}
    >
      <div className="p-4 border-b border-foreground/10">
        <Link href={logoHref} className="text-lg font-bold text-primary">
          {logo ?? "EasyIntake App"}
        </Link>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              pathname.startsWith(item.href)
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-foreground/5"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-foreground/10">
        <SignOutButton>
          <button className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 rounded-lg">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
