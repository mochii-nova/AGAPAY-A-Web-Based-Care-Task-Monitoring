import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

// About 30 common emojis, each with a name for screen readers
const EMOJIS = [
  ['😊', 'smiling face'], ['😀', 'grinning face'], ['🙂', 'slightly smiling face'], ['😂', 'face with tears of joy'],
  ['😅', 'grinning face with sweat'], ['😉', 'winking face'], ['😍', 'smiling face with heart eyes'], ['🥰', 'smiling face with hearts'],
  ['🤗', 'hugging face'], ['🤔', 'thinking face'], ['😮', 'surprised face'], ['😢', 'crying face'],
  ['😴', 'sleeping face'], ['😷', 'face with medical mask'], ['❤️', 'red heart'], ['💜', 'purple heart'],
  ['🧡', 'orange heart'], ['💕', 'two hearts'], ['👍', 'thumbs up'], ['👎', 'thumbs down'],
  ['👏', 'clapping hands'], ['🙏', 'folded hands'], ['👋', 'waving hand'], ['🙌', 'raising hands'],
  ['💪', 'flexed biceps'], ['✅', 'check mark'], ['❌', 'cross mark'], ['⭐', 'star'],
  ['🎉', 'party popper'], ['☕', 'hot coffee'],
];

// 😊 button next to the message box. Opens a small grid of emojis; picking one calls onPick(emoji).
// Closes with Esc, by clicking outside, or after picking.
export default function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    gridRef.current?.querySelector('button')?.focus();
    const outside = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="emoji" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn emoji__toggle"
        aria-label="Add an emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Smile size={22} aria-hidden="true" />
      </button>
      {open && (
        <div className="emoji__panel" role="dialog" aria-label="Emojis" ref={gridRef}>
          {EMOJIS.map(([emoji, name]) => (
            <button
              key={name}
              type="button"
              className="emoji__btn"
              aria-label={name}
              title={name}
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
