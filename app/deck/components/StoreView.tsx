"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ExternalLink, Tag, Zap, ArrowRight } from "lucide-react";

interface StoreListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  step_count: number;
  services: string[];
  tags: string[];
  status: string;
}

export function StoreView() {
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // Fetch from 0nmcp.com public store API
    fetch("https://0nmcp.com/api/console/store")
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: show some built-in listings
        setListings([
          {
            id: "1",
            title: "The Automation Liberation Campaign",
            slug: "automation-liberation-campaign",
            description:
              "Complete 30-day multi-channel marketing campaign. 7 email sequences, 6 LinkedIn posts, 3 Facebook ad sets, CRM automation, embedded onboarding wizard.",
            category: "marketing",
            price: 8900,
            currency: "usd",
            step_count: 39,
            services: ["crm", "linkedin", "facebook"],
            tags: ["campaign", "email", "linkedin", "facebook", "multi-channel"],
            status: "active",
          },
        ]);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...new Set(listings.map((l) => l.category))];
  const filtered =
    filter === "all" ? listings : listings.filter((l) => l.category === filter);

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto w-full animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-onork-text">Marketplace</h1>
          <p className="text-sm text-onork-text-dim mt-1">
            Pre-built .0n SWITCH files — install and run instantly
          </p>
        </div>
        <a
          href="https://0nmcp.com/console?view=store"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-onork-p1/20 to-onork-b1/20 border border-onork-p1/30 text-onork-p3 text-sm font-medium hover:from-onork-p1/30 hover:to-onork-b1/30 transition-all cursor-pointer"
        >
          Full Store <ExternalLink size={14} />
        </a>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filter === cat
                ? "bg-onork-p1/20 text-onork-p3 border border-onork-p1/30"
                : "bg-white/[0.04] text-onork-text-dim border border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/[0.04] rounded w-full mb-2" />
              <div className="h-3 bg-white/[0.04] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <ShoppingBag size={48} className="mx-auto text-onork-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-onork-text mb-2">No listings yet</h3>
          <p className="text-sm text-onork-text-dim">
            Check back soon or visit the full marketplace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing, i) => (
            <a
              key={listing.id}
              href={`https://0nmcp.com/console?view=store&listing=${listing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-onork-p1/5 transition-all duration-300 group cursor-pointer animate-stagger-in block"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-onork-p1/15 text-onork-p3">
                  {listing.category}
                </span>
                {listing.price === 0 ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-onork-green/15 text-onork-green">
                    Free
                  </span>
                ) : null}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-onork-text mb-2 group-hover:text-onork-p3 transition-colors">
                {listing.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-onork-text-dim leading-relaxed mb-4 line-clamp-3">
                {listing.description}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-onork-text-muted mb-3">
                <div className="flex items-center gap-1">
                  <Zap size={10} className="text-onork-p3" />
                  <span>{listing.step_count} steps</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag size={10} className="text-onork-b2" />
                  <span>{listing.services?.length || 0} services</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {listing.tags?.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-onork-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Price + CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="font-bold text-onork-text">
                  {listing.price === 0 ? "Free" : `$${(listing.price / 100).toFixed(2)}`}
                </span>
                <span className="flex items-center gap-1 text-xs text-onork-p3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowRight size={12} />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
