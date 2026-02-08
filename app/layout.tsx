import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "0nork - Universal Command Orchestrator",
  description: "Connect 22+ services into one unified command center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
