import type { Metadata } from "next";
import "./globals.css";
import "./jampack.css";

export const metadata: Metadata = {
  title: "0ncore — AI Command Center",
  description: "Your AI command center. Manage CRM contacts, run automations with 0nMCP, and track billing — all in one portal.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-core-bg text-core-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
