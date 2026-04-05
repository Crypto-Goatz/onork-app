import type { Metadata } from "next";
import "./globals.css";
import "./jampack.css";

export const metadata: Metadata = {
  title: "0nCore — AI That Runs Your Business | 1,589 Tools, 102 Services",
  description: "The AI-powered CRM with 1,589 tools across 102 services. Automations, voice AI, course generator, domain management — all from one dashboard. Built on 0nMCP. 5 patents pending.",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BE81T6STW6" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-BE81T6STW6');` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('0n-theme')||'light';document.documentElement.setAttribute('data-theme',t)})()` }} />
        <script src="https://api.rocketclients.com/js/external-tracking.js" data-tracking-id="tk_f9c5376df66c45e69941dd3f3bbe22a2" async />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
