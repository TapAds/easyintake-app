import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyAppIntake",
  description: "Intake, validation, and handoff — localized operations shell.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
