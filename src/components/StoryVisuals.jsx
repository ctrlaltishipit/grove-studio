import React from 'react';

// Animated, brand-colored illustrations for the public pages. Pure SVG + CSS
// keyframes, all colors from tokens, all motion off under reduced-motion.

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)' };

// One note flowing into four visual shapes: deck, mind map, chart, audio.
export function VisualsFromNotes() {
  return (
    <div className="story-visual" style={card}>
      <svg viewBox="0 0 460 300" role="img" aria-label="A note turning into slides, a mind map, an infographic and audio">
        <rect x="24" y="86" width="128" height="128" rx="14" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <path d="M46 116 h84 M46 136 h84 M46 156 h60 M46 176 h72" stroke="var(--faint)" strokeWidth="6" strokeLinecap="round" />
        <path d="M46 116 h84" stroke="var(--acc)" strokeWidth="6" strokeLinecap="round" />
        <path d="M164 110 C 230 110, 250 84, 300 84" fill="none" stroke="var(--o1)" strokeWidth="2.5" strokeDasharray="5 7" style={{ animation: 'dashFlow 1.6s linear infinite' }} />
        <path d="M164 138 C 230 138, 250 142, 300 142" fill="none" stroke="var(--o2)" strokeWidth="2.5" strokeDasharray="5 7" style={{ animation: 'dashFlow 1.6s linear infinite', animationDelay: '-.4s' }} />
        <path d="M164 166 C 230 166, 250 200, 300 200" fill="none" stroke="var(--o4)" strokeWidth="2.5" strokeDasharray="5 7" style={{ animation: 'dashFlow 1.6s linear infinite', animationDelay: '-.8s' }} />
        <path d="M164 194 C 230 194, 250 258, 300 258" fill="none" stroke="var(--o5)" strokeWidth="2.5" strokeDasharray="5 7" style={{ animation: 'dashFlow 1.6s linear infinite', animationDelay: '-1.2s' }} />
        <g style={{ animation: 'drift 4.5s ease-in-out infinite' }}>
          <rect x="304" y="58" width="120" height="52" rx="10" fill="var(--acc-soft)" stroke="var(--acc)" strokeWidth="1.5" />
          <rect x="316" y="70" width="52" height="7" rx="3.5" fill="var(--acc)" />
          <rect x="316" y="84" width="80" height="5" rx="2.5" fill="var(--acc-deep)" opacity=".5" />
        </g>
        <g style={{ animation: 'drift 4.5s ease-in-out infinite', animationDelay: '-1s' }}>
          <rect x="304" y="118" width="120" height="50" rx="10" fill="var(--bg)" stroke="var(--o2)" strokeWidth="1.5" />
          <circle cx="340" cy="143" r="7" fill="var(--o2)" />
          <circle cx="372" cy="131" r="4.5" fill="var(--o1)" />
          <circle cx="380" cy="151" r="4.5" fill="var(--o5)" />
          <circle cx="402" cy="139" r="4.5" fill="var(--o3)" />
          <path d="M346 139 L368 133 M347 147 L376 150 M347 141 L398 139" stroke="var(--border-strong)" strokeWidth="1.5" />
        </g>
        <g style={{ animation: 'drift 4.5s ease-in-out infinite', animationDelay: '-2s' }}>
          <rect x="304" y="176" width="120" height="48" rx="10" fill="var(--bg)" stroke="var(--o4)" strokeWidth="1.5" />
          <path d="M322 212 V196 M340 212 V188 M358 212 V202 M376 212 V192 M394 212 V198" stroke="var(--o4)" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g>
          <rect x="304" y="232" width="120" height="44" rx="22" fill="var(--acc)" opacity=".12" />
          <circle cx="328" cy="254" r="12" fill="var(--acc)" />
          <path d="M324 254 L327 258 L333 250" stroke="var(--acc-ink)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {[348, 358, 368, 378, 388, 398].map((x, i) => (
            <rect key={x} x={x} y="244" width="5" height="20" rx="2.5" fill="var(--acc)"
              style={{ transformOrigin: `${x + 2.5}px 254px`, animation: 'eq 1s ease-in-out infinite', animationDelay: `${i * 0.12}s` }} />
          ))}
        </g>
      </svg>
    </div>
  );
}

// A task card hopping across board columns until Done, clock ticking.
export function DecisionFlow() {
  return (
    <div className="story-visual" style={card}>
      <svg viewBox="0 0 460 300" role="img" aria-label="A decision becoming a task that moves across a board to done">
        {['To do', 'Doing', 'Done'].map((label, i) => (
          <g key={label}>
            <rect x={28 + i * 142} y="66" width="126" height="190" rx="14" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
            <rect x={44 + i * 142} y="82" width={i === 2 ? 44 : 52} height="8" rx="4" fill="var(--faint)" opacity=".7" />
          </g>
        ))}
        <g style={{ animation: 'cardHop 5s ease-in-out infinite' }}>
          <rect x="40" y="104" width="102" height="64" rx="10" fill="var(--surface)" stroke="var(--acc)" strokeWidth="1.5" />
          <rect x="50" y="116" width="66" height="7" rx="3.5" fill="var(--ink)" opacity=".75" />
          <rect x="50" y="130" width="46" height="5" rx="2.5" fill="var(--faint)" />
          <circle cx="126" cy="150" r="9" fill="var(--o3)" />
          <rect x="50" y="146" width="40" height="9" rx="4.5" fill="var(--amber-soft)" />
        </g>
        <g style={{ animation: 'pulse 2s ease-in-out infinite' }}>
          <circle cx="230" cy="36" r="15" fill="var(--amber-soft)" />
          <path d="M230 28 v8 l5 3" stroke="var(--amber)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="230" cy="36" r="11" stroke="var(--amber)" strokeWidth="2.4" fill="none" />
        </g>
        <g style={{ animation: 'popLate 5s ease-in-out infinite' }}>
          <circle cx="382" cy="130" r="16" fill="var(--acc)" />
          <path d="M375 130 L380 136 L390 124" stroke="var(--acc-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

// Two named cursors writing the same note, live.
export function LiveWriting() {
  return (
    <div className="story-visual" style={card}>
      <svg viewBox="0 0 460 300" role="img" aria-label="Two teammates writing in the same note with named cursors">
        <rect x="40" y="40" width="380" height="220" rx="16" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <rect x="64" y="66" width="160" height="12" rx="6" fill="var(--ink)" opacity=".8" />
        <path d="M64 104 h300 M64 128 h270 M64 152 h300 M64 176 h180" stroke="var(--border-strong)" strokeWidth="7" strokeLinecap="round" opacity=".55" />
        <path d="M64 200 h230" stroke="var(--acc-soft)" strokeWidth="14" strokeLinecap="round" />
        <g style={{ animation: 'caretRoamA 6s ease-in-out infinite' }}>
          <rect x="0" y="-14" width="2.6" height="20" rx="1.3" fill="var(--o3)" />
          <g transform="translate(0,-20)">
            <rect x="-2" y="-14" width="46" height="16" rx="6" fill="var(--o3)" />
            <text x="21" y="-2.5" textAnchor="middle" fill="var(--o-ink)" fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">Priya</text>
          </g>
        </g>
        <g style={{ animation: 'caretRoamB 6s ease-in-out infinite' }}>
          <rect x="0" y="-14" width="2.6" height="20" rx="1.3" fill="var(--o5)" />
          <g transform="translate(0,-20)">
            <rect x="-2" y="-14" width="40" height="16" rx="6" fill="var(--o5)" />
            <text x="18" y="-2.5" textAnchor="middle" fill="var(--o-ink)" fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">You</text>
          </g>
        </g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={310 + i * 12} cy="232" r="3.5" fill="var(--faint)"
            style={{ animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
        ))}
      </svg>
    </div>
  );
}

// Roles + a lock: shared where you want it, private where you need it.
export function PrivacyRoles() {
  return (
    <div className="story-visual" style={card}>
      <svg viewBox="0 0 460 300" role="img" aria-label="Roles and a note lock keeping private things private">
        <rect x="46" y="70" width="176" height="160" rx="16" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <circle cx="86" cy="110" r="15" fill="var(--o1)" />
        <text x="86" y="115" textAnchor="middle" fill="var(--o-ink)" fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">DS</text>
        <rect x="110" y="102" width="58" height="16" rx="8" fill="var(--acc-soft)" />
        <text x="139" y="114" textAnchor="middle" fill="var(--acc-deep)" fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">Admin</text>
        <circle cx="86" cy="156" r="15" fill="var(--o2)" />
        <text x="86" y="161" textAnchor="middle" fill="var(--o-ink)" fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">US</text>
        <rect x="110" y="148" width="66" height="16" rx="8" fill="var(--sunken)" />
        <text x="143" y="160" textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">Can edit</text>
        <circle cx="86" cy="202" r="15" fill="var(--o4)" />
        <text x="86" y="207" textAnchor="middle" fill="var(--o-ink)" fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">MK</text>
        <rect x="110" y="194" width="72" height="16" rx="8" fill="var(--sunken)" />
        <text x="146" y="206" textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">View only</text>
        <g style={{ animation: 'drift 4s ease-in-out infinite' }}>
          <rect x="262" y="92" width="152" height="120" rx="16" fill="var(--surface)" stroke="var(--acc)" strokeWidth="1.5" />
          <path d="M284 122 h96 M284 142 h72 M284 162 h96" stroke="var(--border-strong)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="396" cy="106" r="16" fill="var(--acc)" />
          <rect x="390" y="102" width="12" height="9" rx="2" fill="var(--acc-ink)" />
          <path d="M392.5 102 v-3 a3.5 3.5 0 0 1 7 0 v3" stroke="var(--acc-ink)" strokeWidth="2" fill="none" />
        </g>
      </svg>
    </div>
  );
}
