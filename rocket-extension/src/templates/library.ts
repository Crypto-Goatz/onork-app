import type { Template } from "./types";
import {
  THUMB_MOTHERS_DAY,
  THUMB_HOLIDAY,
  THUMB_SERVICE_MENU,
  THUMB_LEAD_CAPTURE,
  THUMB_THANK_YOU,
  THUMB_COMING_SOON,
} from "./thumbnails";

const BASE_STYLES = `:root {
  --bg: #0d1117;
  --card: #161b22;
  --elevated: #1c2128;
  --border: #30363d;
  --primary: #6EE05A;
  --primary-hover: #5bc74a;
  --text: #e6edf3;
  --text-secondary: #c9d1d9;
  --muted: #8b949e;
  --danger: #f87171;
  --warning: #fbbf24;
  --accent: #58a6ff;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg);
  color: var(--text-secondary);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}
.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.btn {
  display: inline-block;
  background: var(--primary);
  color: var(--bg);
  font-weight: 600;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background 150ms ease, transform 150ms ease;
}
.btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover { background: var(--elevated); border-color: var(--primary); }
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 24px;
}
h1 { color: var(--text); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
h2 { color: var(--text); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
h3 { color: var(--text); font-size: 1.25rem; font-weight: 600; }
p { color: var(--text-secondary); }
.muted { color: var(--muted); }
.eyebrow { color: var(--primary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.section { padding: 80px 0; }
@media (max-width: 720px) {
  .section { padding: 56px 0; }
}`;

function htmlDoc(title: string, body: string, extraStyles = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>${BASE_STYLES}
${extraStyles}</style>
</head>
<body>
${body}
</body>
</html>`;
}

const MOTHERS_DAY_HTML = htmlDoc(
  "{{headline}} | {{business_name}}",
  `<header class="hero">
  <div class="container hero-inner">
    <span class="eyebrow">{{eyebrow}}</span>
    <h1>{{headline}}</h1>
    <p class="hero-sub">{{subheadline}}</p>
    <div class="hero-cta">
      <a href="{{cta_url}}" class="btn">{{cta_text}}</a>
      <a href="tel:{{phone}}" class="btn btn-secondary">Call {{phone}}</a>
    </div>
    <p class="urgency">{{urgency_line}}</p>
  </div>
</header>

<section class="section">
  <div class="container">
    <h2 style="text-align:center; margin-bottom: 12px;">Pick the perfect gift</h2>
    <p style="text-align:center; max-width: 580px; margin: 0 auto 48px;">{{deals_intro}}</p>
    <div class="deals-grid">
      <div class="card deal">
        <div class="deal-tier">Sweet</div>
        <div class="deal-price">\${{deal_1_price}}</div>
        <p>{{deal_1_desc}}</p>
        <a href="{{cta_url}}" class="btn deal-btn">Gift this</a>
      </div>
      <div class="card deal featured">
        <div class="deal-badge">Most Popular</div>
        <div class="deal-tier">Glowing</div>
        <div class="deal-price">\${{deal_2_price}}</div>
        <p>{{deal_2_desc}}</p>
        <a href="{{cta_url}}" class="btn deal-btn">Gift this</a>
      </div>
      <div class="card deal">
        <div class="deal-tier">Radiant</div>
        <div class="deal-price">\${{deal_3_price}}</div>
        <p>{{deal_3_desc}}</p>
        <a href="{{cta_url}}" class="btn deal-btn">Gift this</a>
      </div>
      <div class="card deal">
        <div class="deal-tier">Ultimate</div>
        <div class="deal-price">\${{deal_4_price}}</div>
        <p>{{deal_4_desc}}</p>
        <a href="{{cta_url}}" class="btn deal-btn">Gift this</a>
      </div>
    </div>
  </div>
</section>

<section class="section services">
  <div class="container">
    <h2>What's included</h2>
    <ul class="services-list">
      <li>{{service_1}}</li>
      <li>{{service_2}}</li>
      <li>{{service_3}}</li>
      <li>{{service_4}}</li>
    </ul>
  </div>
</section>

<section class="section urgency-band">
  <div class="container">
    <h2>{{urgency_headline}}</h2>
    <p>{{urgency_body}}</p>
    <a href="{{cta_url}}" class="btn">{{cta_text}}</a>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <strong style="color: var(--text);">{{business_name}}</strong>
        <p>{{address}}</p>
        <p>{{phone}}</p>
      </div>
      <div class="footer-meta muted">© {{business_name}}. All rights reserved.</div>
    </div>
  </div>
</footer>`,
  `.hero {
  background: radial-gradient(circle at 20% 0%, rgba(110, 224, 90, 0.08), transparent 60%), var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 120px 0 80px;
}
.hero-inner { max-width: 760px; }
.hero-sub { font-size: 1.15rem; margin: 16px 0 32px; max-width: 580px; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
.urgency { color: var(--warning); font-size: 0.9rem; margin-top: 24px; }
.deals-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
@media (max-width: 960px) { .deals-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .deals-grid { grid-template-columns: 1fr; } }
.deal { display: flex; flex-direction: column; gap: 8px; position: relative; }
.deal.featured { border-color: var(--primary); background: linear-gradient(180deg, rgba(110,224,90,0.05), var(--card)); }
.deal-tier { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.deal-price { color: var(--text); font-size: 2.5rem; font-weight: 700; line-height: 1; }
.deal-badge { position: absolute; top: -10px; right: 16px; background: var(--primary); color: var(--bg); font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em; }
.deal-btn { margin-top: auto; text-align: center; }
.services-list { list-style: none; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 32px; }
@media (max-width: 720px) { .services-list { grid-template-columns: 1fr; } }
.services-list li { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; color: var(--text-secondary); }
.services-list li::before { content: "✓"; color: var(--primary); font-weight: 700; margin-right: 12px; }
.urgency-band { background: var(--card); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; }
.urgency-band h2 { margin-bottom: 16px; }
.urgency-band p { max-width: 560px; margin: 0 auto 28px; }
.footer { padding: 40px 0; border-top: 1px solid var(--border); }
.footer-grid { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; align-items: center; }
.footer p { font-size: 0.9rem; }
.footer-meta { font-size: 0.85rem; }`,
);

const HOLIDAY_HTML = htmlDoc(
  "{{headline}} | {{business_name}}",
  `<header class="hero">
  <div class="container">
    <span class="eyebrow">{{occasion}}</span>
    <h1>{{headline}}</h1>
    <p class="hero-sub">{{subheadline}}</p>
    <div id="countdown" class="countdown muted" data-deadline="{{countdown_deadline}}">Offer ends {{countdown_deadline}}</div>
    <a href="{{cta_url}}" class="btn">{{cta_text}}</a>
  </div>
</header>

<section class="section">
  <div class="container tiers">
    <div class="card tier">
      <div class="tier-name">{{tier_1_name}}</div>
      <div class="tier-price">\${{tier_1_price}}</div>
      <p>{{tier_1_desc}}</p>
      <a href="{{cta_url}}" class="btn">Choose</a>
    </div>
    <div class="card tier featured">
      <div class="tier-badge">Best Value</div>
      <div class="tier-name">{{tier_2_name}}</div>
      <div class="tier-price">\${{tier_2_price}}</div>
      <p>{{tier_2_desc}}</p>
      <a href="{{cta_url}}" class="btn">Choose</a>
    </div>
    <div class="card tier">
      <div class="tier-name">{{tier_3_name}}</div>
      <div class="tier-price">\${{tier_3_price}}</div>
      <p>{{tier_3_desc}}</p>
      <a href="{{cta_url}}" class="btn">Choose</a>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="container muted" style="text-align:center;">
    <strong style="color: var(--text);">{{business_name}}</strong> · {{phone}} · {{address}}
  </div>
</footer>
<script>
(function () {
  var el = document.getElementById('countdown');
  if (!el) return;
  var deadline = new Date(el.dataset.deadline).getTime();
  if (isNaN(deadline)) return;
  function tick() {
    var diff = deadline - Date.now();
    if (diff <= 0) { el.textContent = 'Offer ended'; return; }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    el.textContent = 'Ends in ' + d + 'd ' + h + 'h ' + m + 'm';
  }
  tick(); setInterval(tick, 60000);
})();
</script>`,
  `.hero { padding: 120px 0 80px; text-align: center; background: radial-gradient(circle at 50% 0%, rgba(110, 224, 90, 0.08), transparent 60%); }
.hero-sub { max-width: 560px; margin: 16px auto 12px; font-size: 1.1rem; }
.countdown { margin-bottom: 28px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.95rem; }
.tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 760px) { .tiers { grid-template-columns: 1fr; } }
.tier { display: flex; flex-direction: column; gap: 10px; position: relative; }
.tier.featured { border-color: var(--primary); background: linear-gradient(180deg, rgba(110,224,90,0.05), var(--card)); }
.tier-name { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; font-size: 0.85rem; }
.tier-price { color: var(--text); font-size: 2.25rem; font-weight: 700; }
.tier-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: var(--bg); padding: 4px 12px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.tier .btn { margin-top: auto; text-align: center; }
.footer { padding: 40px 0; border-top: 1px solid var(--border); font-size: 0.9rem; }`,
);

const SERVICE_MENU_HTML = htmlDoc(
  "{{business_name}} — {{headline}}",
  `<header class="hero">
  <div class="container">
    <span class="eyebrow">{{eyebrow}}</span>
    <h1>{{headline}}</h1>
    <p class="hero-sub">{{subheadline}}</p>
  </div>
</header>

<section class="section">
  <div class="container menu">
    <div class="menu-row">
      <div>
        <h3>{{service_1_name}}</h3>
        <p class="muted">{{service_1_desc}}</p>
      </div>
      <div class="menu-meta">
        <div class="menu-price">\${{service_1_price}}</div>
        <a href="{{cta_url}}" class="btn">Book</a>
      </div>
    </div>
    <div class="menu-row">
      <div>
        <h3>{{service_2_name}}</h3>
        <p class="muted">{{service_2_desc}}</p>
      </div>
      <div class="menu-meta">
        <div class="menu-price">\${{service_2_price}}</div>
        <a href="{{cta_url}}" class="btn">Book</a>
      </div>
    </div>
    <div class="menu-row">
      <div>
        <h3>{{service_3_name}}</h3>
        <p class="muted">{{service_3_desc}}</p>
      </div>
      <div class="menu-meta">
        <div class="menu-price">\${{service_3_price}}</div>
        <a href="{{cta_url}}" class="btn">Book</a>
      </div>
    </div>
    <div class="menu-row">
      <div>
        <h3>{{service_4_name}}</h3>
        <p class="muted">{{service_4_desc}}</p>
      </div>
      <div class="menu-meta">
        <div class="menu-price">\${{service_4_price}}</div>
        <a href="{{cta_url}}" class="btn">Book</a>
      </div>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="container muted" style="text-align:center;">
    <strong style="color: var(--text);">{{business_name}}</strong> · {{phone}} · {{address}}
  </div>
</footer>`,
  `.hero { padding: 100px 0 56px; }
.hero-sub { max-width: 560px; margin-top: 12px; }
.menu { display: flex; flex-direction: column; gap: 12px; }
.menu-row { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px 24px; display: flex; justify-content: space-between; gap: 24px; align-items: center; transition: border-color 150ms ease; }
.menu-row:hover { border-color: var(--primary); }
.menu-meta { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.menu-price { color: var(--text); font-weight: 700; font-size: 1.25rem; font-family: "JetBrains Mono", monospace; }
@media (max-width: 600px) { .menu-row { flex-direction: column; align-items: flex-start; } }
.footer { padding: 40px 0; border-top: 1px solid var(--border); font-size: 0.9rem; }`,
);

const LEAD_CAPTURE_HTML = htmlDoc(
  "{{headline}} | {{business_name}}",
  `<main class="wrapper">
  <div class="container lc-grid">
    <div class="lc-copy">
      <span class="eyebrow">{{eyebrow}}</span>
      <h1>{{headline}}</h1>
      <p class="hero-sub">{{subheadline}}</p>
      <ul class="bullets">
        <li>{{bullet_1}}</li>
        <li>{{bullet_2}}</li>
        <li>{{bullet_3}}</li>
      </ul>
    </div>
    <form class="card lc-form" action="{{form_action}}" method="post">
      <h3 style="margin-bottom: 8px;">{{form_headline}}</h3>
      <p class="muted" style="margin-bottom: 20px;">{{form_subheadline}}</p>
      <label>
        <span>First name</span>
        <input name="first_name" type="text" required />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" required />
      </label>
      <label>
        <span>Phone</span>
        <input name="phone" type="tel" />
      </label>
      <button type="submit" class="btn lc-btn">{{cta_text}}</button>
      <p class="muted lc-fine">{{privacy_line}}</p>
    </form>
  </div>
</main>`,
  `.wrapper { padding: 80px 0; min-height: 100vh; display: flex; align-items: center; }
.lc-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center; }
@media (max-width: 860px) { .lc-grid { grid-template-columns: 1fr; gap: 32px; } }
.hero-sub { font-size: 1.1rem; margin: 16px 0 24px; }
.bullets { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.bullets li { color: var(--text-secondary); padding-left: 28px; position: relative; }
.bullets li::before { content: ""; position: absolute; left: 0; top: 8px; width: 16px; height: 16px; border-radius: 9999px; background: rgba(110, 224, 90, 0.15); }
.bullets li::after { content: "✓"; position: absolute; left: 4px; top: 4px; color: var(--primary); font-weight: 700; font-size: 0.85rem; }
.lc-form { display: flex; flex-direction: column; gap: 14px; }
.lc-form label { display: flex; flex-direction: column; gap: 6px; }
.lc-form label span { color: var(--muted); font-size: 0.8rem; font-weight: 500; }
.lc-form input { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 11px 14px; font-size: 0.95rem; font-family: inherit; transition: border-color 150ms ease, box-shadow 150ms ease; }
.lc-form input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(110, 224, 90, 0.15); }
.lc-btn { width: 100%; margin-top: 8px; padding: 14px; }
.lc-fine { font-size: 0.75rem; text-align: center; }`,
);

const THANK_YOU_HTML = htmlDoc(
  "Thank you | {{business_name}}",
  `<main class="wrapper">
  <div class="container ty-inner">
    <div class="ty-check">
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#6EE05A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 12 10 18 20 6"></polyline>
      </svg>
    </div>
    <h1>{{headline}}</h1>
    <p class="hero-sub">{{subheadline}}</p>
    <div class="ty-meta card">
      <div>
        <div class="muted ty-meta-label">Order #</div>
        <div class="ty-meta-value">{{order_number}}</div>
      </div>
      <div>
        <div class="muted ty-meta-label">Confirmation sent to</div>
        <div class="ty-meta-value">{{confirmation_email}}</div>
      </div>
    </div>

    <section class="upsell card">
      <div class="upsell-tag">{{upsell_tag}}</div>
      <h2>{{upsell_headline}}</h2>
      <p>{{upsell_body}}</p>
      <a href="{{upsell_cta_url}}" class="btn">{{upsell_cta_text}}</a>
    </section>

    <p class="muted ty-foot">Questions? Call <a href="tel:{{phone}}" style="color: var(--primary);">{{phone}}</a></p>
  </div>
</main>`,
  `.wrapper { padding: 80px 0; }
.ty-inner { max-width: 640px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.ty-check { width: 80px; height: 80px; border-radius: 9999px; background: rgba(110, 224, 90, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.hero-sub { font-size: 1.05rem; max-width: 520px; }
.ty-meta { width: 100%; display: flex; justify-content: space-between; gap: 24px; text-align: left; flex-wrap: wrap; margin-top: 8px; }
.ty-meta-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
.ty-meta-value { color: var(--text); font-family: "JetBrains Mono", monospace; font-weight: 500; margin-top: 4px; }
.upsell { width: 100%; text-align: left; margin-top: 16px; border-color: var(--primary); background: linear-gradient(180deg, rgba(110,224,90,0.05), var(--card)); }
.upsell-tag { color: var(--primary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 8px; }
.upsell h2 { font-size: 1.5rem; margin-bottom: 8px; }
.upsell .btn { margin-top: 16px; }
.ty-foot { margin-top: 24px; font-size: 0.9rem; }`,
);

const COMING_SOON_HTML = htmlDoc(
  "{{headline}} | {{business_name}}",
  `<main class="wrapper">
  <div class="container cs-inner">
    <div class="brand">{{business_name}}</div>
    <h1>{{headline}}</h1>
    <p class="hero-sub">{{subheadline}}</p>
    <form class="cs-form card" action="{{form_action}}" method="post">
      <input name="email" type="email" placeholder="you@email.com" required />
      <button type="submit" class="btn">{{cta_text}}</button>
    </form>
    <p class="muted cs-fine">{{social_proof}}</p>
    <div class="cs-foot muted">
      <a href="tel:{{phone}}">{{phone}}</a> · {{address}}
    </div>
  </div>
</main>`,
  `.wrapper { min-height: 100vh; display: flex; align-items: center; padding: 64px 0; background: radial-gradient(circle at 50% 0%, rgba(110, 224, 90, 0.06), transparent 60%); }
.cs-inner { max-width: 620px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.brand { color: var(--primary); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.85rem; }
.hero-sub { font-size: 1.1rem; max-width: 520px; margin: 8px 0 16px; }
.cs-form { display: flex; gap: 8px; padding: 8px; width: 100%; max-width: 480px; }
.cs-form input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); padding: 12px 14px; font-family: inherit; font-size: 0.95rem; transition: border-color 150ms ease, box-shadow 150ms ease; }
.cs-form input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(110, 224, 90, 0.15); }
.cs-fine { font-size: 0.8rem; }
.cs-foot { margin-top: 32px; font-size: 0.85rem; }
.cs-foot a { color: var(--primary); }`,
);

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "mothers-day-gift-card",
    name: "Mother's Day Gift Card",
    category: "Campaign Pages",
    description:
      "Hero, four-tier deal grid, services list, urgency band, and footer. Tuned for the spa Mother's Day campaign but reusable for any seasonal gift card push.",
    thumbnail: THUMB_MOTHERS_DAY,
    updatedAt: "2026-05-03",
    version: 1,
    html: MOTHERS_DAY_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "The Spa In Ligonier", autoFillFrom: "name" },
      { key: "phone", label: "Phone", type: "text", defaultValue: "(724) 238-7474", autoFillFrom: "phone" },
      { key: "address", label: "Address", type: "text", defaultValue: "212 W Main St, Ligonier PA", autoFillFrom: "address" },
      { key: "eyebrow", label: "Eyebrow", type: "text", defaultValue: "Mother's Day" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Give the gift she'll actually use." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "A gift card from the spa — picked up the same day, stretched across her favorite services. Choose a tier, pick a date, done." },
      { key: "cta_text", label: "CTA text", type: "text", defaultValue: "Buy a gift card" },
      { key: "cta_url", label: "CTA URL", type: "url", defaultValue: "https://spaligonier.com/gift-card" },
      { key: "urgency_line", label: "Urgency line", type: "text", defaultValue: "Order by Sat May 10 for in-store pickup." },
      { key: "deals_intro", label: "Deals intro", type: "textarea", defaultValue: "Four tiers, every one redeemable across our service menu." },
      { key: "deal_1_price", label: "Tier 1 price", type: "currency", defaultValue: "75" },
      { key: "deal_1_desc", label: "Tier 1 description", type: "textarea", defaultValue: "30-min express facial or shoulder massage." },
      { key: "deal_2_price", label: "Tier 2 price", type: "currency", defaultValue: "150" },
      { key: "deal_2_desc", label: "Tier 2 description", type: "textarea", defaultValue: "Signature facial + manicure. Most-gifted tier." },
      { key: "deal_3_price", label: "Tier 3 price", type: "currency", defaultValue: "250" },
      { key: "deal_3_desc", label: "Tier 3 description", type: "textarea", defaultValue: "Half-day: massage, facial, and lunch on us." },
      { key: "deal_4_price", label: "Tier 4 price", type: "currency", defaultValue: "400" },
      { key: "deal_4_desc", label: "Tier 4 description", type: "textarea", defaultValue: "Full spa day for two — massage, facial, mani-pedi, lunch." },
      { key: "service_1", label: "Service 1", type: "text", defaultValue: "Custom facials with our master estheticians" },
      { key: "service_2", label: "Service 2", type: "text", defaultValue: "Therapeutic massage — Swedish, deep tissue, hot stone" },
      { key: "service_3", label: "Service 3", type: "text", defaultValue: "Mani-pedis with the brands she already trusts" },
      { key: "service_4", label: "Service 4", type: "text", defaultValue: "Brow shaping, lash lifts, and waxing" },
      { key: "urgency_headline", label: "Urgency headline", type: "text", defaultValue: "Cards available through Sunday" },
      { key: "urgency_body", label: "Urgency body", type: "textarea", defaultValue: "We close at 2pm Saturday and we're closed Mother's Day so she can rest. Buy by 5pm Saturday for guaranteed pickup." },
    ],
  },
  {
    id: "holiday-promotion",
    name: "Holiday Promotion",
    category: "Campaign Pages",
    description:
      "Three-tier holiday gift card / promotion template with a live countdown timer. Drop-in for any seasonal campaign.",
    thumbnail: THUMB_HOLIDAY,
    updatedAt: "2026-05-03",
    version: 1,
    html: HOLIDAY_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "Your Business", autoFillFrom: "name" },
      { key: "phone", label: "Phone", type: "text", defaultValue: "(555) 555-1212", autoFillFrom: "phone" },
      { key: "address", label: "Address", type: "text", defaultValue: "123 Main St", autoFillFrom: "address" },
      { key: "occasion", label: "Occasion eyebrow", type: "text", defaultValue: "Holiday Special" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Give the gift everyone actually wants." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Three tiers. Pick one, send it instantly, done." },
      { key: "cta_text", label: "CTA text", type: "text", defaultValue: "Send a gift card" },
      { key: "cta_url", label: "CTA URL", type: "url", defaultValue: "https://example.com/buy" },
      { key: "countdown_deadline", label: "Countdown deadline (ISO)", type: "text", defaultValue: "2026-12-24T23:59:00", hint: "ISO format — e.g. 2026-12-24T23:59:00" },
      { key: "tier_1_name", label: "Tier 1 name", type: "text", defaultValue: "Stocking" },
      { key: "tier_1_price", label: "Tier 1 price", type: "currency", defaultValue: "50" },
      { key: "tier_1_desc", label: "Tier 1 description", type: "textarea", defaultValue: "A small thank-you that always lands." },
      { key: "tier_2_name", label: "Tier 2 name", type: "text", defaultValue: "Family" },
      { key: "tier_2_price", label: "Tier 2 price", type: "currency", defaultValue: "150" },
      { key: "tier_2_desc", label: "Tier 2 description", type: "textarea", defaultValue: "Splits cleanly across two people. Most popular." },
      { key: "tier_3_name", label: "Tier 3 name", type: "text", defaultValue: "Showstopper" },
      { key: "tier_3_price", label: "Tier 3 price", type: "currency", defaultValue: "300" },
      { key: "tier_3_desc", label: "Tier 3 description", type: "textarea", defaultValue: "The one they'll remember next year." },
    ],
  },
  {
    id: "service-menu",
    name: "Service Menu",
    category: "Landing Pages",
    description:
      "Clean service listing with prices and book-now buttons. Four-row layout, mono-pricing, hover state per row.",
    thumbnail: THUMB_SERVICE_MENU,
    updatedAt: "2026-05-03",
    version: 1,
    html: SERVICE_MENU_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "Your Business", autoFillFrom: "name" },
      { key: "phone", label: "Phone", type: "text", defaultValue: "(555) 555-1212", autoFillFrom: "phone" },
      { key: "address", label: "Address", type: "text", defaultValue: "123 Main St", autoFillFrom: "address" },
      { key: "eyebrow", label: "Eyebrow", type: "text", defaultValue: "Services" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "What we do, and what it costs." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Plain prices, no upsell theatre. Book any service in under 60 seconds." },
      { key: "cta_url", label: "Booking URL", type: "url", defaultValue: "https://example.com/book" },
      { key: "service_1_name", label: "Service 1 name", type: "text", defaultValue: "Signature service" },
      { key: "service_1_desc", label: "Service 1 description", type: "text", defaultValue: "Our most-booked offering — 60 minutes." },
      { key: "service_1_price", label: "Service 1 price", type: "currency", defaultValue: "120" },
      { key: "service_2_name", label: "Service 2 name", type: "text", defaultValue: "Express option" },
      { key: "service_2_desc", label: "Service 2 description", type: "text", defaultValue: "Same outcome, half the time. 30 minutes." },
      { key: "service_2_price", label: "Service 2 price", type: "currency", defaultValue: "65" },
      { key: "service_3_name", label: "Service 3 name", type: "text", defaultValue: "Deluxe package" },
      { key: "service_3_desc", label: "Service 3 description", type: "text", defaultValue: "The premium tier — 90 minutes, full menu access." },
      { key: "service_3_price", label: "Service 3 price", type: "currency", defaultValue: "200" },
      { key: "service_4_name", label: "Service 4 name", type: "text", defaultValue: "Membership" },
      { key: "service_4_desc", label: "Service 4 description", type: "text", defaultValue: "One per month, billed monthly. Cancel anytime." },
      { key: "service_4_price", label: "Service 4 price", type: "currency", defaultValue: "99" },
    ],
  },
  {
    id: "lead-capture",
    name: "Lead Capture",
    category: "Funnels",
    description:
      "Two-column opt-in: copy + bullets on the left, conversion form on the right. Use for free guides, consults, waitlists.",
    thumbnail: THUMB_LEAD_CAPTURE,
    updatedAt: "2026-05-03",
    version: 1,
    html: LEAD_CAPTURE_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "Your Business", autoFillFrom: "name" },
      { key: "eyebrow", label: "Eyebrow", type: "text", defaultValue: "Free guide" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Get the playbook we actually use." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "An honest 12-page PDF on what works for us — written for owners, not designers. Sent to your inbox in under a minute." },
      { key: "bullet_1", label: "Bullet 1", type: "text", defaultValue: "What we'd skip if we started over" },
      { key: "bullet_2", label: "Bullet 2", type: "text", defaultValue: "The two metrics we actually look at every Monday" },
      { key: "bullet_3", label: "Bullet 3", type: "text", defaultValue: "Templates you can copy/paste this week" },
      { key: "form_headline", label: "Form headline", type: "text", defaultValue: "Send me the playbook" },
      { key: "form_subheadline", label: "Form subheadline", type: "text", defaultValue: "Free. No spam. Unsubscribe with one click." },
      { key: "cta_text", label: "CTA text", type: "text", defaultValue: "Send it" },
      { key: "form_action", label: "Form action URL", type: "url", defaultValue: "/api/lead", hint: "POST endpoint or CRM webhook URL" },
      { key: "privacy_line", label: "Privacy line", type: "text", defaultValue: "We never share your details. Reply STOP to opt out." },
    ],
  },
  {
    id: "thank-you",
    name: "Thank You / Confirmation",
    category: "Thank You Pages",
    description:
      "Post-purchase confirmation with order number, email confirmation, and an upsell card under it.",
    thumbnail: THUMB_THANK_YOU,
    updatedAt: "2026-05-03",
    version: 1,
    html: THANK_YOU_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "Your Business", autoFillFrom: "name" },
      { key: "phone", label: "Phone", type: "text", defaultValue: "(555) 555-1212", autoFillFrom: "phone" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "You're all set." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "We've sent you a confirmation email with everything you need. If you don't see it, check spam or call us — we'll fix it in 30 seconds." },
      { key: "order_number", label: "Order number placeholder", type: "text", defaultValue: "{{order_number}}", hint: "Replace with funnel order var if available" },
      { key: "confirmation_email", label: "Confirmation email placeholder", type: "text", defaultValue: "{{contact.email}}" },
      { key: "upsell_tag", label: "Upsell tag", type: "text", defaultValue: "One more thing" },
      { key: "upsell_headline", label: "Upsell headline", type: "text", defaultValue: "Add this and save 15%" },
      { key: "upsell_body", label: "Upsell body", type: "textarea", defaultValue: "Pair what you just bought with the one add-on most customers grab right after — at a 15% discount, only on this page." },
      { key: "upsell_cta_text", label: "Upsell CTA text", type: "text", defaultValue: "Add it" },
      { key: "upsell_cta_url", label: "Upsell CTA URL", type: "url", defaultValue: "https://example.com/upsell" },
    ],
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    category: "Landing Pages",
    description:
      "Single-screen teaser with email capture. Use to validate demand or hold a domain you haven't built out yet.",
    thumbnail: THUMB_COMING_SOON,
    updatedAt: "2026-05-03",
    version: 1,
    html: COMING_SOON_HTML,
    variables: [
      { key: "business_name", label: "Business name", type: "text", defaultValue: "Your Business", autoFillFrom: "name" },
      { key: "phone", label: "Phone", type: "text", defaultValue: "(555) 555-1212", autoFillFrom: "phone" },
      { key: "address", label: "Address", type: "text", defaultValue: "123 Main St", autoFillFrom: "address" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Something good is coming." },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "We're putting the finishing touches on it. Drop your email and you'll hear about it before the rest of the world does." },
      { key: "cta_text", label: "CTA text", type: "text", defaultValue: "Notify me" },
      { key: "form_action", label: "Form action URL", type: "url", defaultValue: "/api/waitlist" },
      { key: "social_proof", label: "Social proof line", type: "text", defaultValue: "Join 1,200+ already on the list." },
    ],
  },
];
