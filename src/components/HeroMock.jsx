import React from 'react';

// The hero's picture: the real product, drawn in HTML. A shared note with two
// people writing, one sentence picked out, a task landing on the board, and
// the check-in that follows. It plays once on load and rests on the end state;
// under reduced motion it shows the end state straight away. Decorative to
// screen readers: the page copy says the same thing in words.

function Av({ c, t }) {
  return <span className="hm-av" style={{ background: c }}>{t}</span>;
}

export default function HeroMock() {
  return (
    <div className="hm" aria-hidden="true">
      <div className="hm-bar">
        <span className="hm-dots"><i /><i /><i /></span>
        <span className="hm-crumb">Launch team <b>/</b> Weekly sync, Tue</span>
        <span className="hm-live"><Av c="var(--o1)" t="MK" /><Av c="var(--o3)" t="AR" /><Av c="var(--o5)" t="SA" /><em>3 here</em></span>
      </div>

      <div className="hm-body">
        <div className="hm-note">
          <div className="hm-title">Weekly sync</div>
          <div className="hm-meta">Shared note · edited just now</div>
          <p>Pricing page goes live with the launch.</p>
          <p>Support needs the new FAQ before then.<span className="hm-caret" style={{ background: 'var(--o1)', animationDelay: '-.5s' }}><b style={{ background: 'var(--o1)' }}>Meera</b></span></p>
          <p className="hm-pick">
            <span className="hm-hl">Arjun to send the pricing draft by Friday.</span>
            <span className="hm-make">Make task</span>
          </p>
          <p className="hm-typing">
            Sam will check the FAQ copy<span className="hm-caret" style={{ background: 'var(--o5)' }}><b style={{ background: 'var(--o5)' }}>Sam</b></span>
          </p>
        </div>

        <div className="hm-board">
          <div className="hm-col-head">To do <span>3</span></div>
          <div className="hm-card hm-new">
            <span className="hm-tag">From note</span>
            <div className="hm-card-title">Send the pricing draft</div>
            <div className="hm-card-foot"><Av c="var(--o3)" t="AR" /> Arjun <span className="hm-due">Due Fri</span></div>
          </div>
          <div className="hm-card">
            <div className="hm-card-title">Write the launch FAQ</div>
            <div className="hm-card-foot"><Av c="var(--o5)" t="SA" /> Sam <span className="hm-due">Due Thu</span></div>
          </div>
          <div className="hm-card hm-faint">
            <div className="hm-card-title">Book the demo room</div>
            <div className="hm-card-foot"><Av c="var(--o1)" t="MK" /> Meera</div>
          </div>
        </div>
      </div>

      <div className="hm-checkin">
        <span className="hm-sprout" />
        <div>
          <b>Check-in for Arjun</b>
          <span>How is the pricing draft going? It is due Friday.</span>
        </div>
        <span className="hm-reply">On track</span>
      </div>
    </div>
  );
}
