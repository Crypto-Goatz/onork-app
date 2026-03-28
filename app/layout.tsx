import type { Metadata } from "next";
import "./globals.css";
import "./jampack.css";

export const metadata: Metadata = {
  title: "0nCore — AI That Runs Your Business | 900+ Tools, 55 Services",
  description: "The AI-powered CRM that replaces 15 SaaS tools. 900+ tools, 55 services, voice AI, automations builder, course generator, domain management — all from one dashboard. Built on 0nMCP. Starts at $80/mo.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "0nCore — One Brain. Every Service. Zero Limits.",
    description: "AI-powered CRM with 900+ tools. Automations builder, voice AI, course generator, domain management, multi-AI council. Your AI runs your business. Starts at $80/mo.",
    url: "https://0ncore.com",
    siteName: "0nCore",
    type: "website",
    images: [{
      url: "https://0ncore.com/og-image.png",
      width: 1200,
      height: 630,
      alt: "0nCore — AI That Runs Your Business",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "0nCore — One Brain. Every Service. Zero Limits.",
    description: "AI-powered CRM with 900+ tools. Your AI runs your business.",
    images: ["https://0ncore.com/og-image.png"],
  },
  keywords: ["AI CRM", "AI automation", "MCP server", "0nMCP", "voice AI", "course generator", "CRM marketplace", "business automation", "AI assistant", "workflow builder"],
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
