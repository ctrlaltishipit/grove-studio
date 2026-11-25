import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav, { SiteFooter, usePageMeta } from '../components/PublicNav';
import { PRIVACY, TERMS, UPDATED } from '../lib/legal';

// The privacy note and the terms of use: a short "in short" summary up top,
// then every section, with a contents list that follows your reading.

function Shield() {
  return (
    <svg className="legal-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 12 98 26v30c0 26-16 44-38 52C38 100 22 82 22 56V26L60 12Z" className="la-shape" />
      <path d="M60 24 88 34v22c0 19-11 33-28 40-17-7-28-21-28-40V34l28-10Z" className="la-inner" />
      <path d="M46 60l10 10 19-21" className="la-tick" />
    </svg>
  );
}
function Scroll() {
  return (
    <svg className="legal-art" viewBox="0 0 120 120" aria-hidden="true">
      <rect x="26" y="16" width="68" height="88" rx="10" className="la-shape" />
      <rect x="34" y="24" width="52" height="72" rx="6" className="la-inner" />
      {[38, 50, 62].map((y, i) => <path key={y} d={`M42 ${y}h${[36, 28, 32][i]}`} className="la-line" style={{ '--i': i }} />)}
      <path d="M44 80l8 7 14-16" className="la-tick" />
    </svg>
  );
}

function Item({ it }) {
  if (Array.isArray(it)) return <li><b>{it[0]}.</b> {it[1]}</li>;
  return <li>{it}</li>;
}

export default function Legal({ kind }) {
  const doc = kind === 'terms' ? TERMS : PRIVACY;
  usePageMeta(
    `${doc.title} | GroveStudio`,
    kind === 'terms'
      ? 'The terms for using GroveStudio: your content, acceptable use, AI outputs, early access and our responsibilities, in plain words.'
      : 'How GroveStudio handles your data: what we collect, how the Studio uses AI providers, who can see your notes, cookies, and your rights.'
  );
  const [active, setActive] = useState(doc.sections[0].id);
  useEffect(() => {
    const els = doc.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-20% 0px -70% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [kind]);

  return (
    <div className="site">
      <PublicNav />
      <main id="main">
        <section className="page-hero legal-hero">
          <div className="hero-ground" aria-hidden="true" />
          <div className="wrap page-hero-inner">
            <div className="enter" style={{ '--d': 0 }}>{kind === 'terms' ? <Scroll /> : <Shield />}</div>
            <p className="eyebrow enter" style={{ '--d': 0 }}><span className="sprout-dot" />Last updated {UPDATED}</p>
            <h1 className="enter" style={{ '--d': 1 }}>{doc.title}</h1>
            <p className="hero-sub enter" style={{ '--d': 2 }}>{doc.lead}</p>
            <nav className="jump enter" style={{ '--d': 3 }} aria-label="Legal pages">
              <Link to="/privacy" className={kind !== 'terms' ? 'on' : ''}>Privacy note</Link>
              <Link to="/terms" className={kind === 'terms' ? 'on' : ''}>Terms of use</Link>
            </nav>
          </div>
        </section>

        <section className="band band-sunken legal-band">
          <div className="wrap legal-grid">
            <aside className="legal-toc" aria-label="Contents">
              <span className="legal-toc-h">Contents</span>
              <ol>
                {doc.sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`} className={active === s.id ? 'on' : ''}>{s.h}</a></li>
                ))}
              </ol>
            </aside>

            <article className="legal-doc">
              <div className="legal-short rv">
                <h2>In short</h2>
                <ul>{doc.short.map((t, i) => <li key={i} style={{ '--i': i }}>{t}</li>)}</ul>
              </div>
              {doc.sections.map((s, i) => (
                <section key={s.id} id={s.id} className="legal-sec" aria-labelledby={`${s.id}-h`}>
                  <h2 id={`${s.id}-h`}><span>{String(i + 1).padStart(2, '0')}</span>{s.h}</h2>
                  {(s.p || []).map((t, k) => <p key={k}>{t}</p>)}
                  {s.list && <ul className="legal-list">{s.list.map((it, k) => <Item key={k} it={it} />)}</ul>}
                  {s.bullets && <ul className="legal-bullets">{s.bullets.map((it, k) => <Item key={k} it={it} />)}</ul>}
                  {(s.p2 || []).map((t, k) => <p key={k}>{t}</p>)}
                </section>
              ))}
              <p className="legal-foot">
                {kind === 'terms'
                  ? <>See also our <Link to="/privacy">Privacy note</Link>.</>
                  : <>See also our <Link to="/terms">Terms of use</Link>.</>}
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
