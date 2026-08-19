import { notFound } from "next/navigation";
import { Metadata } from "next";
import AnimatedGrid from "@/components/animated-grid";
import {
  COMPARISON_DATA,
  VALID_SLUGS,
  type ColumnData,
  type Feature,
} from "@/lib/compare-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = COMPARISON_DATA[slug];
  if (!data) return {};

  return {
    title: `${data.headline} | 0nCore`,
    description: data.subheadline,
    openGraph: {
      title: `${data.headline} | 0nCore`,
      description: data.subheadline,
      url: `https://www.0ncore.com/compare/${slug}`,
      siteName: "0nCore",
      type: "website",
    },
  };
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="9" fill="#7ed957" fillOpacity={0.15} />
      <path
        d="M5.5 9.5L7.5 11.5L12.5 6.5"
        stroke="#7ed957"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="9" fill="#ffffff" fillOpacity={0.05} />
      <path
        d="M6 6L12 12M12 6L6 12"
        stroke="#555555"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 0",
      }}
    >
      {feature.has ? <CheckIcon /> : <XIcon />}
      <span
        style={{
          fontSize: "14px",
          color: feature.has ? "#e0e0e0" : "#666666",
        }}
      >
        {feature.text}
      </span>
    </div>
  );
}

function ComparisonCard({
  column,
  variant,
  label,
  buttonText,
  buttonHref,
}: {
  column: ColumnData;
  variant: "current" | "crm" | "full";
  label: string;
  buttonText?: string;
  buttonHref?: string;
}) {
  const isFull = variant === "full";
  const isCurrent = variant === "current";

  return (
    <div
      style={{
        flex: 1,
        minWidth: "280px",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: "16px",
        border: isFull ? "2px solid #7ed957" : "1px solid rgba(255,255,255,0.08)",
        padding: "32px 24px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isFull && (
        <div
          style={{
            position: "absolute",
            top: "-13px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#7ed957",
            color: "#04070f",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 16px",
            borderRadius: "20px",
          }}
        >
          RECOMMENDED
        </div>
      )}

      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#888888",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: "4px",
        }}
      >
        {column.name}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          color: isCurrent ? "#ef4444" : "#7ed957",
          marginBottom: "24px",
        }}
      >
        {column.price}
      </div>

      <div
        style={{
          flex: 1,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "16px",
          marginBottom: "24px",
        }}
      >
        {column.features.map((f, i) => (
          <FeatureRow key={i} feature={f} />
        ))}
      </div>

      {buttonText && buttonHref && (
        <a
          href={buttonHref}
          style={{
            display: "block",
            textAlign: "center",
            padding: "14px 24px",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 700,
            textDecoration: "none",
            transition: "opacity 0.2s",
            ...(isFull
              ? {
                  backgroundColor: "#7ed957",
                  color: "#04070f",
                }
              : {
                  backgroundColor: "transparent",
                  color: "#7ed957",
                  border: "2px solid #7ed957",
                }),
          }}
        >
          {buttonText}
        </a>
      )}
    </div>
  );
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params;
  const data = COMPARISON_DATA[slug];

  if (!data) {
    notFound();
  }

  return (
    <div style={{ background: "#020810", color: "#fff", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: "rgba(2,8,16,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.png"
            alt="0nCore"
            style={{ height: "32px", width: "auto" }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            0nCore
          </span>
        </a>
        <a
          href="/"
          style={{
            fontSize: "14px",
            color: "#888888",
            textDecoration: "none",
          }}
        >
          Back to Home
        </a>
      </nav>

      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden" }}>
      <AnimatedGrid />
      <div aria-hidden style={{ pointerEvents: "none", position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", height: 480, width: 480, borderRadius: "50%", background: "rgba(126,217,87,0.07)", filter: "blur(150px)" }} />
      <div
        style={{
          position: "relative",
          maxWidth: "960px",
          margin: "0 auto",
          padding: "64px 24px 80px",
        }}
      >
        {/* Kicker */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "rgba(126, 217, 87, 0.1)",
              border: "1px solid rgba(126, 217, 87, 0.3)",
              color: "#7ed957",
              fontSize: "13px",
              fontWeight: 600,
              padding: "6px 20px",
              borderRadius: "100px",
              letterSpacing: "0.02em",
            }}
          >
            {data.kicker}
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            textAlign: "center",
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "0 0 16px",
          }}
        >
          <span
            style={{
              backgroundImage:
                "linear-gradient(135deg, #7ed957, #00d4ff, #a78bfa)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {data.headline}
          </span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            textAlign: "center",
            fontSize: "17px",
            lineHeight: 1.6,
            color: "#999999",
            maxWidth: "640px",
            margin: "0 auto 56px",
          }}
        >
          {data.subheadline}
        </p>

        {/* Comparison Grid */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <ComparisonCard
            column={data.current}
            variant="current"
            label="You have"
          />
          <ComparisonCard
            column={data.crm}
            variant="crm"
            label="Upgrade to"
            buttonText="Get Started"
            buttonHref="/signup"
          />
          <ComparisonCard
            column={data.full}
            variant="full"
            label="Add AI on top"
            buttonText="Start with 0nMCP"
            buttonHref="/signup?plan=full"
          />
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            textAlign: "center",
            marginTop: "56px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              color: "#888888",
              margin: "0 0 8px",
            }}
          >
            Questions? Not sure which plan is right?
          </p>
          <a
            href="https://calendly.com/rocketopp/15min"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#7ed957",
              textDecoration: "none",
            }}
          >
            Book a 15-minute call
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}
