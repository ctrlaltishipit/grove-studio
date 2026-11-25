import React, { useEffect, useRef, useState } from 'react';

// The product film: a poster with a big play button, then the real video with
// controls. Chapter chips jump to each part and light up as it plays.
export default function Film({ src, poster, chapters = [], title }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const on = () => setT(v.currentTime);
    v.addEventListener('timeupdate', on);
    return () => v.removeEventListener('timeupdate', on);
  }, []);

  const play = (at) => {
    const v = ref.current;
    if (!v) return;
    if (typeof at === 'number') v.currentTime = at;
    setStarted(true);
    v.play().catch(() => {});
  };
  const current = chapters.reduce((acc, c, i) => (t >= c.at ? i : acc), 0);

  return (
    <div className="film">
      <div className={'film-frame' + (started ? ' on' : '')}>
        <video ref={ref} src={src} poster={poster} controls={started} playsInline preload="metadata"
          aria-label={title} onPlay={() => setStarted(true)} />
        {!started && (
          <button className="film-play" onClick={() => play(0)} aria-label={`Play: ${title}`}>
            <span className="film-play-ring" aria-hidden="true" />
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" /></svg>
          </button>
        )}
      </div>
      {chapters.length > 0 && (
        <ol className="film-chapters" aria-label="Chapters">
          {chapters.map((c, i) => (
            <li key={c.label}>
              <button className={started && i === current ? 'on' : ''} onClick={() => play(c.at)}>
                <span>{String(Math.floor(c.at / 60)).padStart(1, '0')}:{String(Math.floor(c.at % 60)).padStart(2, '0')}</span>{c.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
