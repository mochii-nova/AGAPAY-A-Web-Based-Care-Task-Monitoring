import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const GAP = 12; // between the highlighted thing and the card
const EDGE = 16; // the card never comes closer than this to the window's edge
const WAIT = 2000; // how long to wait for a step's target to appear (e.g. the Start here card loading)

// The first target that is actually on screen (the sidebar is pushed off-screen on phones)
function findTarget(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const shown = r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && getComputedStyle(el).visibility !== 'hidden';
    if (shown) return el;
  }
  return null;
}

// Where the card goes: to the right of something on the left edge (the sidebar or one of its links),
// else below it, else above it.
function place(rect, card) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.min(Math.max(x, EDGE), vw - card.width - EDGE);
  const clampY = (y) => Math.min(Math.max(y, EDGE), vh - card.height - EDGE);
  if (rect.right < vw * 0.3 && rect.right + GAP + card.width + EDGE <= vw) {
    // The whole sidebar: a little below its top; one link: level with it
    const top = rect.height > vh * 0.6 ? rect.top + 120 : rect.top + rect.height / 2 - card.height / 2;
    return { left: rect.right + GAP, top: clampY(top) };
  }
  // Line the card up with the target's left edge, or its right edge when it sits on the right
  const left = clampX(rect.left + rect.width / 2 > vw / 2 ? rect.right - card.width : rect.left);
  if (rect.bottom + GAP + card.height + EDGE <= vh) return { left, top: rect.bottom + GAP };
  if (rect.top - GAP - card.height >= EDGE) return { left, top: rect.top - GAP - card.height };
  return { left, top: clampY(rect.bottom + GAP) };
}

// A short guided tour: a small card next to each highlighted part of the page.
// steps: [{ targets: [css selectors], title, text }]. When no target is on screen, the card sits in the
// middle. Back / Next / Skip / Done; Esc closes; Tab stays inside the card.
export default function Tour({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null); // the highlighted target, or null (card in the middle)
  const [pos, setPos] = useState(null);
  const [ready, setReady] = useState(false); // the target was looked for
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  // Give focus back to where it was when the tour closes
  useEffect(() => {
    const before = document.activeElement;
    return () => before?.focus?.();
  }, []);

  // Look for this step's target (waiting a little for it to appear), and bring it into view
  useEffect(() => {
    setReady(false);
    let el = null;
    const started = Date.now();
    const look = () => {
      el = findTarget(step.targets);
      if (!el && Date.now() - started < WAIT) return false;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
      }
      setRect(el ? el.getBoundingClientRect() : null);
      setReady(true);
      return true;
    };
    if (look()) return undefined;
    const timer = setInterval(() => look() && clearInterval(timer), 150);
    return () => clearInterval(timer);
  }, [step]);

  // Follow the target when the window is resized or scrolled
  const measure = useCallback(() => {
    const el = findTarget(step.targets);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);
  useEffect(() => {
    if (!ready) return undefined;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ready, measure]);

  // Place the card once its size is known
  useLayoutEffect(() => {
    if (!ready || !cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    setPos(rect ? place(rect, card) : null);
  }, [ready, rect, index]);

  // Each new step, once its card is shown: focus the title, so screen readers read it and the keys
  // work straight away
  const shown = ready && (!rect || !!pos);
  useEffect(() => {
    if (shown) titleRef.current?.focus({ preventScroll: true });
  }, [shown, index]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      // Keep Tab inside the card
      const items = [...cardRef.current.querySelectorAll('button')];
      const first = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const centered = ready && !rect;
  return (
    <div className="tour" onKeyDown={onKeyDown}>
      {/* Dims the page; the highlight is a hole in it around the target. Clicks on the page are blocked. */}
      <div className={`tour__backdrop ${rect ? 'is-clear' : ''}`} aria-hidden="true" />
      {rect && (
        <div
          className="tour__spot"
          aria-hidden="true"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        ref={cardRef}
        className={`tour__card ${centered ? 'is-centered' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={pos ? { left: pos.left, top: pos.top } : undefined}
        data-ready={shown ? 'true' : 'false'}
      >
        <p className="tour__count">Step {index + 1} of {steps.length}</p>
        <h2 id="tour-title" ref={titleRef} tabIndex={-1} className="tour__title">{step.title}</h2>
        <p id="tour-text" className="tour__text">{step.text}</p>
        <div className="tour__actions">
          {!last && <button type="button" className="link-btn tour__skip" onClick={onClose}>Skip</button>}
          <span className="tour__nav">
            {index > 0 && <button type="button" className="btn btn--outline btn--sm" onClick={() => setIndex(index - 1)}>Back</button>}
            <button type="button" className="btn btn--primary btn--sm" onClick={() => (last ? onClose() : setIndex(index + 1))}>
              {last ? 'Done' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
