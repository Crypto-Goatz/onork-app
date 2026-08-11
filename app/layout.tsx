import { cookies, headers } from 'next/headers';
import type { Metadata } from "next";
import "./globals.css";
import "./jampack.css";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { PublicNavWrapper } from "@/components/public-nav-wrapper";
import { VoiceAIFloatingButton } from "@/components/voice-ai-floating";
import { LaunchBanner } from "@/components/launch-banner";
import { GroqBanner } from "@/components/GroqBanner";

// Per docs/0n-design-system.md §2 — Inter as font-sans, JetBrains Mono as font-mono.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// Space Grotesk is the marketplace dashboard's UI face, per the 6-tile spec.
// Scoped by variable rather than applied to body, so the rest of the site keeps
// Inter and nothing else repaints.
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // app.0ncore.com is the product surface; everything else is the marketing site.
  const isAppHost = (await headers()).get('host') === 'app.0ncore.com'

  // Which side the agency rail sits on. Read on the SERVER so the page renders
  // on the chosen side immediately — reading it client-side would paint the
  // rail on one edge and snap it to the other, on every navigation.
  const sidebarSide = (await cookies()).get('oc_sidebar_side')?.value === 'right' ? 'right' : 'left'

  return (
    <html
      lang="en"
      data-sidebar-side={sidebarSide}
      className={cn("dark font-sans", inter.variable, mono.variable)}
    >
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7ed957" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="0nCore" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Fonts loaded via next/font (Inter + JetBrains Mono) — no stylesheet needed */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BE81T6STW6" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-BE81T6STW6');` }} />
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','dark')` }} />
        <script src="https://api.rocketclients.com/js/external-tracking.js" data-tracking-id="tk_f9c5376df66c45e69941dd3f3bbe22a2" async />
        {/* Quora Conversion Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `!function(q,e,v,n,t,s){if(q.qp)return;n=q.qp=function(){n.qp?n.qp.apply(n,arguments):n.queue.push(arguments)};n.queue=[];t=document.createElement(e);t.async=!0;t.src=v;s=document.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,'script','https://a.quora.com/qevents.js');qp('init','ec66803919f947b8368908ed792c882b');qp('track','ViewContent');` }} />
        {/*
          Detect & Refine tracker — Phase 1 grader. Click → session →
          engagement signals to dr_clicks/dr_sessions/dr_ai_scores in
          pwujhhmlrtxjmjzyttwn (same DB as everything else here). Third
          family install after 0nmcp.com and jaxspot-app.vercel.app.
        */}
        <script
          src="https://rocketpost.co/cro9.js"
          data-account-id="acct_c48453c3b54655"
          async
        />
        {/*
          Detect & Refine, this site's own tracker.
          Served from /api/dr/script/[siteId] on this domain, so it is
          first-party: no cross-origin request, nothing for a tracking blocker
          to recognise by hostname, and the config (siteId, domain, endpoint) is
          baked in server-side rather than passed as data-attributes that can
          drift from the site it is installed on.

          Root layout, so it is on EVERY page including the marketing pages and
          the app shell — which is the point, since the value is in seeing the
          whole journey rather than one surface.
        */}
        <script
          src="https://www.0ncore.com/api/dr/script/dr_0ncore_com_4wdui5.js"
          async
        />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
        {/*
          THE APP HOST GETS NO MARKETING CHROME AT ALL.
          app.0ncore.com is the product; www.0ncore.com is the site. Banners, the
          public nav and the floating voice button belong to the site.

          DECIDED BY HOST, NOT BY PATH. PublicNavWrapper excludes by pathname,
          but middleware REWRITES every app-host path into /crm — and
          usePathname() reports the pre-rewrite URL, so /clients and / never
          matched an exclusion and the marketing header rendered straight over
          the dashboard. Reading the host here is both correct and server-side,
          so nothing flashes in before being hidden.
        */}
        {!isAppHost && (
          <>
            <LaunchBanner />
            <GroqBanner />
            <PublicNavWrapper />
          </>
        )}
        {children}
        {!isAppHost && <VoiceAIFloatingButton />}
        </Providers>
      </body>
    </html>
  );
}
