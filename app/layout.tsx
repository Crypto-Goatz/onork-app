import type { Metadata } from "next";
import "./globals.css";
import "./jampack.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { PublicNavWrapper } from "@/components/public-nav-wrapper";
import { VoiceAIFloatingButton } from "@/components/voice-ai-floating";
import { LaunchBanner } from "@/components/launch-banner";
import { GroqBanner } from "@/components/GroqBanner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.0ncore.com"),
  title: {
    default: "0nCore — AI That Runs Your Business | 1,589+ Tools, 102 Services",
    template: "%s · 0nCore",
  },
  description: "The AI-powered CRM with 1,589+ tools across 109 services. Automations, voice AI, course generator, app builder, website builder, SaaS factory — all from one dashboard. Built on 0nMCP. Live now.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "0nCore — One Brain. Every Service. Zero Limits.",
    description: "AI-powered CRM with 1,589+ tools. Automations builder, voice AI, course generator, app/site builder, SaaS factory, agentic generator. Free tier. Live now.",
    url: "https://www.0ncore.com",
    siteName: "0nCore",
    type: "website",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "0nCore — AI That Runs Your Business",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "0nCore — One Brain. Every Service. Zero Limits.",
    description: "AI-powered CRM with 1,589+ tools. Free tier. Live now.",
    images: ["/og-image.png"],
  },
  keywords: ["AI CRM", "AI automation", "MCP server", "0nMCP", "voice AI", "course generator", "CRM marketplace", "business automation", "AI assistant", "workflow builder", "agentic AI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7ed957" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="0nCore" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BE81T6STW6" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-BE81T6STW6');` }} />
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','dark')` }} />
        <script src="https://api.rocketclients.com/js/external-tracking.js" data-tracking-id="tk_f9c5376df66c45e69941dd3f3bbe22a2" async />
        {/* Quora Conversion Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `!function(q,e,v,n,t,s){if(q.qp)return;n=q.qp=function(){n.qp?n.qp.apply(n,arguments):n.queue.push(arguments)};n.queue=[];t=document.createElement(e);t.async=!0;t.src=v;s=document.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,'script','https://a.quora.com/qevents.js');qp('init','ec66803919f947b8368908ed792c882b');qp('track','ViewContent');` }} />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
        <LaunchBanner />
        <GroqBanner />
        <PublicNavWrapper />
        {children}
        <VoiceAIFloatingButton />
        </Providers>
      </body>
    </html>
  );
}
