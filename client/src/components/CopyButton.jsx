import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyText } from '../utils/clipboard';

// A small "Copy" link-button for a piece of text (e.g. an email address); shows "Copied" for 2 seconds.
// `className` is added to the button, for spacing where it's used.
export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={`link-btn copy-btn ${className}`}
      onClick={async () => setCopied(await copyText(text))}
      aria-label={copied ? `Copied ${text}` : `Copy ${text}`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
