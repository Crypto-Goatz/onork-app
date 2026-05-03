// Inline SVG thumbnails for each template. Kept tiny — they render in cards
// and are copied into the .json export verbatim.

const SVG_HEAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">`;

export const THUMB_MOTHERS_DAY = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <rect x="0" y="0" width="200" height="42" fill="#161b22"/>
  <rect x="12" y="14" width="46" height="6" rx="3" fill="#6EE05A"/>
  <rect x="12" y="24" width="80" height="4" rx="2" fill="#30363d"/>
  <rect x="12" y="52" width="40" height="48" rx="6" fill="#161b22" stroke="#30363d"/>
  <rect x="56" y="52" width="40" height="48" rx="6" fill="#161b22" stroke="#6EE05A"/>
  <rect x="100" y="52" width="40" height="48" rx="6" fill="#161b22" stroke="#30363d"/>
  <rect x="144" y="52" width="44" height="48" rx="6" fill="#161b22" stroke="#30363d"/>
  <circle cx="170" cy="14" r="6" fill="#f87171"/>
</svg>`;

export const THUMB_HOLIDAY = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <rect x="20" y="14" width="160" height="22" rx="4" fill="#6EE05A" opacity="0.15"/>
  <rect x="32" y="20" width="80" height="6" rx="3" fill="#6EE05A"/>
  <rect x="32" y="30" width="120" height="3" rx="1.5" fill="#8b949e"/>
  <rect x="20" y="48" width="50" height="56" rx="6" fill="#161b22" stroke="#30363d"/>
  <rect x="76" y="48" width="50" height="56" rx="6" fill="#161b22" stroke="#6EE05A"/>
  <rect x="132" y="48" width="48" height="56" rx="6" fill="#161b22" stroke="#30363d"/>
</svg>`;

export const THUMB_SERVICE_MENU = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <rect x="12" y="12" width="60" height="6" rx="3" fill="#e6edf3"/>
  <rect x="12" y="22" width="100" height="3" rx="1.5" fill="#8b949e"/>
  <g>
    <rect x="12" y="36" width="176" height="18" rx="4" fill="#161b22" stroke="#30363d"/>
    <rect x="20" y="42" width="50" height="4" rx="2" fill="#e6edf3"/>
    <rect x="160" y="42" width="20" height="4" rx="2" fill="#6EE05A"/>
  </g>
  <g>
    <rect x="12" y="58" width="176" height="18" rx="4" fill="#161b22" stroke="#30363d"/>
    <rect x="20" y="64" width="50" height="4" rx="2" fill="#e6edf3"/>
    <rect x="160" y="64" width="20" height="4" rx="2" fill="#6EE05A"/>
  </g>
  <g>
    <rect x="12" y="80" width="176" height="18" rx="4" fill="#161b22" stroke="#30363d"/>
    <rect x="20" y="86" width="50" height="4" rx="2" fill="#e6edf3"/>
    <rect x="160" y="86" width="20" height="4" rx="2" fill="#6EE05A"/>
  </g>
</svg>`;

export const THUMB_LEAD_CAPTURE = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <rect x="50" y="14" width="100" height="92" rx="8" fill="#161b22" stroke="#30363d"/>
  <rect x="58" y="22" width="60" height="5" rx="2.5" fill="#e6edf3"/>
  <rect x="58" y="32" width="84" height="3" rx="1.5" fill="#8b949e"/>
  <circle cx="60" cy="46" r="2" fill="#6EE05A"/>
  <rect x="66" y="44" width="60" height="3" rx="1.5" fill="#c9d1d9"/>
  <circle cx="60" cy="54" r="2" fill="#6EE05A"/>
  <rect x="66" y="52" width="60" height="3" rx="1.5" fill="#c9d1d9"/>
  <circle cx="60" cy="62" r="2" fill="#6EE05A"/>
  <rect x="66" y="60" width="60" height="3" rx="1.5" fill="#c9d1d9"/>
  <rect x="58" y="72" width="84" height="10" rx="3" fill="#0d1117" stroke="#30363d"/>
  <rect x="58" y="86" width="84" height="12" rx="3" fill="#6EE05A"/>
</svg>`;

export const THUMB_THANK_YOU = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <circle cx="100" cy="40" r="18" fill="#6EE05A" opacity="0.15"/>
  <path d="M92 40 l6 6 l12 -12" stroke="#6EE05A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="60" y="68" width="80" height="5" rx="2.5" fill="#e6edf3"/>
  <rect x="40" y="78" width="120" height="3" rx="1.5" fill="#8b949e"/>
  <rect x="20" y="92" width="160" height="20" rx="6" fill="#161b22" stroke="#30363d"/>
  <rect x="30" y="98" width="60" height="4" rx="2" fill="#6EE05A"/>
  <rect x="30" y="104" width="80" height="3" rx="1.5" fill="#8b949e"/>
</svg>`;

export const THUMB_COMING_SOON = `${SVG_HEAD}
  <rect width="200" height="120" fill="#0d1117"/>
  <rect x="60" y="20" width="80" height="6" rx="3" fill="#6EE05A"/>
  <rect x="40" y="34" width="120" height="3" rx="1.5" fill="#8b949e"/>
  <rect x="40" y="50" width="120" height="22" rx="6" fill="#161b22" stroke="#30363d"/>
  <rect x="50" y="58" width="60" height="6" rx="3" fill="#0d1117" stroke="#30363d"/>
  <rect x="118" y="56" width="36" height="10" rx="3" fill="#6EE05A"/>
  <g opacity="0.6">
    <rect x="60" y="86" width="20" height="3" rx="1.5" fill="#8b949e"/>
    <rect x="86" y="86" width="20" height="3" rx="1.5" fill="#8b949e"/>
    <rect x="112" y="86" width="20" height="3" rx="1.5" fill="#8b949e"/>
  </g>
</svg>`;
