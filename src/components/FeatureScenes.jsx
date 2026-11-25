import React from 'react';

// Four large drawn scenes for the Features page, one per group. Pure SVG,
// coloured by tokens, every motion in CSS (site-visuals / landing css) and
// still under reduced motion.

const P = ({ x, y, w, h, r = 10, c = 'fs-card', ...rest }) => <rect x={x} y={y} width={w} height={h} rx={r} className={c} {...rest} />;

function Write() {
  return (
    <svg viewBox="0 0 520 400" className="fscene fs-write" role="img" aria-label="Three people writing in one note, with named cursors, a comment and earlier versions behind it">
      {/* earlier versions, stacked behind */}
      <g className="fs-stack">
        <P x={104} y={26} w={330} h={300} r={18} c="fs-card fs-ghost2" />
        <P x={92} y={38} w={330} h={300} r={18} c="fs-card fs-ghost1" />
      </g>
      <g className="fs-float">
        <P x={78} y={52} w={340} h={310} r={18} />
        <rect x={102} y={78} width={160} height={14} rx={7} className="fs-ink-strong" />
        <rect x={102} y={100} width={92} height={8} rx={4} className="fs-ink-faint" />
        {[132, 160, 188, 216, 244].map((y, i) => (
          <rect key={y} x={102} y={y} width={[270, 230, 286, 200, 248][i]} height={10} rx={5} className="fs-ink fs-typeline" style={{ '--i': i }} />
        ))}
        {/* cursors with names */}
        <g className="fs-cur c1"><rect x={330} y={152} width={3} height={22} /><rect x={330} y={136} width={52} height={16} rx={4} /><text x={336} y={148}>Arjun</text></g>
        <g className="fs-cur c2"><rect x={300} y={208} width={3} height={22} /><rect x={300} y={192} width={46} height={16} rx={4} /><text x={306} y={204}>Priya</text></g>
        <g className="fs-cur c3"><rect x={348} y={236} width={3} height={22} /><rect x={348} y={220} width={40} height={16} rx={4} /><text x={354} y={232}>Sam</text></g>
        {/* dictation */}
        <g className="fs-mic" transform="translate(102 300)">
          <rect width={128} height={36} rx={18} className="fs-pill" />
          <circle cx={20} cy={18} r={9} className="fs-dot" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => <rect key={k} x={38 + k * 11} y={10} width={5} height={16} rx={2.5} className="fs-wave" style={{ '--i': k }} />)}
        </g>
      </g>
      {/* a comment pinned to a line */}
      <g className="fs-pop" style={{ '--d': '1.2s' }} transform="translate(380 270)">
        <path d="M0 10a10 10 0 0 1 10-10h110a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H26l-14 12V60h-2A10 10 0 0 1 0 50Z" className="fs-bubble" />
        <circle cx={22} cy={22} r={9} className="fs-av a2" />
        <rect x={38} y={16} width={74} height={7} rx={3.5} className="fs-ink" />
        <rect x={16} y={38} width={96} height={7} rx={3.5} className="fs-ink-faint" />
      </g>
      <g className="fs-pop" style={{ '--d': '.4s' }} transform="translate(16 70)">
        <rect width={92} height={30} rx={15} className="fs-tag" /><text x={46} y={20} className="fs-tag-t">v12 saved</text>
      </g>
    </svg>
  );
}

function Studio() {
  return (
    <svg viewBox="0 0 520 400" className="fscene fs-studio" role="img" aria-label="One note fanning out into a summary, a mind map, slides, a chart and audio">
      <g className="fs-rays">
        {[[400, 60], [440, 160], [410, 270], [300, 340], [120, 330]].map(([x, y], i) => (
          <path key={i} d={`M190 200 C ${(190 + x) / 2} 200, ${(190 + x) / 2} ${y + 40}, ${x} ${y + 40}`} className="fs-ray" style={{ '--i': i }} />
        ))}
      </g>
      <g className="fs-float">
        <P x={100} y={130} w={150} h={150} r={18} />
        <rect x={118} y={150} width={80} height={10} rx={5} className="fs-ink-strong" />
        {[174, 192, 210, 228, 246].map((y, i) => <rect key={y} x={118} y={y} width={[110, 92, 114, 76, 100][i]} height={7} rx={3.5} className="fs-ink" />)}
      </g>
      {/* outputs */}
      <g className="fs-out" style={{ '--i': 0 }} transform="translate(340 30)">
        <P x={0} y={0} w={130} h={74} r={12} />
        <text x={14} y={22} className="fs-lab">Summary</text>
        {[34, 46, 58].map((y, i) => <rect key={y} x={14} y={y} width={[96, 80, 88][i]} height={6} rx={3} className="fs-ink" />)}
      </g>
      <g className="fs-out" style={{ '--i': 1 }} transform="translate(388 128)">
        <P x={0} y={0} w={120} h={80} r={12} />
        <circle cx={60} cy={40} r={11} className="fs-node main" />
        {[[22, 18], [98, 18], [22, 62], [98, 62]].map(([x, y], k) => <g key={k}><line x1={60} y1={40} x2={x} y2={y} className="fs-edge" /><circle cx={x} cy={y} r={7} className="fs-node" /></g>)}
      </g>
      <g className="fs-out" style={{ '--i': 2 }} transform="translate(350 236)">
        <rect width={130} height={76} rx={12} className="fs-slide" />
        <rect x={14} y={18} width={70} height={9} rx={4.5} className="fs-on-dark" />
        <rect x={14} y={36} width={96} height={6} rx={3} className="fs-on-dark-faint" />
        <rect x={14} y={48} width={80} height={6} rx={3} className="fs-on-dark-faint" />
      </g>
      <g className="fs-out" style={{ '--i': 3 }} transform="translate(236 316)">
        <P x={0} y={0} w={120} h={70} r={12} />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={18 + k * 24} y={56 - [24, 38, 18, 44][k]} width={14} height={[24, 38, 18, 44][k]} rx={3} className="fs-bar" style={{ '--i': k }} />)}
      </g>
      <g className="fs-out" style={{ '--i': 4 }} transform="translate(40 330)">
        <P x={0} y={0} w={150} h={50} r={25} />
        <circle cx={25} cy={25} r={14} className="fs-dot" />
        <path d="M21 18v14l11-7Z" className="fs-play" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => <rect key={k} x={50 + k * 10} y={17} width={5} height={16} rx={2.5} className="fs-wave" style={{ '--i': k }} />)}
      </g>
      {/* ask, with its source */}
      <g className="fs-pop" style={{ '--d': '1.6s' }} transform="translate(20 40)">
        <path d="M0 12a12 12 0 0 1 12-12h150a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H30L16 70V58h-4A12 12 0 0 1 0 46Z" className="fs-bubble" />
        <text x={14} y={24} className="fs-q">What did we decide?</text>
        <rect x={14} y={34} width={88} height={14} rx={7} className="fs-src" /><text x={22} y={44} className="fs-src-t">From: Weekly sync</text>
      </g>
    </svg>
  );
}

function Work() {
  const cols = [40, 154, 268, 382];
  return (
    <svg viewBox="0 0 520 400" className="fscene fs-work" role="img" aria-label="A Kanban board with a card moving to Done, a notification bell and a check-in">
      <g className="fs-float">
        <P x={20} y={60} w={480} h={300} r={20} c="fs-card fs-board" />
        {cols.map((x, i) => (
          <g key={x}>
            <rect x={x} y={84} width={100} height={256} rx={12} className="fs-col" />
            <rect x={x + 12} y={96} width={[44, 70, 60, 36][i]} height={8} rx={4} className="fs-ink-faint" />
            {[0, 1, 2].slice(0, [3, 2, 1, 2][i]).map((r) => (
              <g key={r}>
                <rect x={x + 8} y={116 + r * 64} width={84} height={54} rx={9} className="fs-kcard" />
                <rect x={x + 18} y={128 + r * 64} width={56} height={6} rx={3} className="fs-ink" />
                <circle cx={x + 78} cy={156 + r * 64} r={7} className={'fs-av a' + ((r + i) % 3 + 1)} />
              </g>
            ))}
          </g>
        ))}
        <g className="fs-move">
          <rect x={48} y={244} width={84} height={54} rx={9} className="fs-kcard hot" />
          <rect x={58} y={256} width={56} height={6} rx={3} className="fs-on-dark" />
          <circle cx={118} cy={284} r={7} className="fs-av a1" />
        </g>
      </g>
      <g className="fs-pop" style={{ '--d': '.6s' }} transform="translate(392 10)">
        <rect width={108} height={40} rx={20} className="fs-pill" />
        <path d="M24 26v-7a8 8 0 0 1 16 0v7l3 3H21l3-3ZM29 32h6" className="fs-bell" />
        <circle cx={40} cy={13} r={5} className="fs-alert" />
        <rect x={54} y={16} width={40} height={8} rx={4} className="fs-ink" />
      </g>
      <g className="fs-pop" style={{ '--d': '1.8s' }} transform="translate(30 10)">
        <rect width={170} height={40} rx={20} className="fs-pill" />
        <circle cx={20} cy={20} r={10} className="fs-dot" />
        <path d="M15 20l4 4 7-8" className="fs-tick" />
        <text x={38} y={25} className="fs-q">On track for Friday</text>
      </g>
    </svg>
  );
}

function Share() {
  return (
    <svg viewBox="0 0 520 400" className="fscene fs-share" role="img" aria-label="A six-character code, an email invite and teammates joining a shared space">
      <g className="fs-float">
        <P x={150} y={120} w={220} h={170} r={22} />
        <rect x={172} y={142} width={44} height={44} rx={12} className="fs-space" />
        <text x={194} y={171} className="fs-space-t">W</text>
        <rect x={228} y={150} width={110} height={11} rx={5.5} className="fs-ink-strong" />
        <rect x={228} y={170} width={70} height={8} rx={4} className="fs-ink-faint" />
        {'K7Q2PA'.split('').map((ch, i) => (
          <g key={i} className="fs-key" style={{ '--i': i }}>
            <rect x={172 + i * 31} y={210} width={26} height={34} rx={7} className="fs-keycap" />
            <text x={185 + i * 31} y={233} className="fs-keych">{ch}</text>
          </g>
        ))}
        <g transform="translate(172 256)">
          {[0, 1, 2, 3].map((k) => <circle key={k} cx={12 + k * 18} cy={12} r={11} className={'fs-av a' + (k % 3 + 1) + ' fs-join'} style={{ '--i': k }} />)}
        </g>
      </g>
      {/* people arriving along dotted paths */}
      {[[40, 60], [460, 70], [470, 330], [50, 340]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y} Q ${(x + 260) / 2} ${y < 200 ? y - 30 : y + 30} 260 205`} className="fs-path" style={{ '--i': i }} />
          <circle cx={x} cy={y} r={16} className={'fs-av a' + (i % 3 + 1)} />
        </g>
      ))}
      <g className="fs-fly">
        <rect x={0} y={0} width={64} height={44} rx={8} className="fs-mail" />
        <path d="M4 6l28 20L60 6" className="fs-mail-l" />
      </g>
      <g className="fs-pop" style={{ '--d': '1s' }} transform="translate(370 130)">
        <rect width={110} height={36} rx={18} className="fs-pill" />
        <path d="M18 17h14v12H18zM20 17v-3a5 5 0 0 1 10 0v3" className="fs-lock" />
        <text x={40} y={23} className="fs-q">Private</text>
      </g>
    </svg>
  );
}

export default function FeatureScene({ kind }) {
  if (kind === 'write') return <Write />;
  if (kind === 'studio') return <Studio />;
  if (kind === 'work') return <Work />;
  return <Share />;
}
