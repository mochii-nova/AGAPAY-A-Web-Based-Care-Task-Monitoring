import { useEffect, useState } from 'react';
import { Phone, Copy, Check } from 'lucide-react';
import useMediaQuery from '../hooks/useMediaQuery';
import { telHref } from '../utils/format';
import { copyText } from '../utils/clipboard';

// A phone number. Phones and tablets (touch): a tap-to-call link. Laptops and desktops (no touch,
// so a tel: link would open a calling app nobody uses): the number as text with a small "Copy" button.
// `className`: for the link on touch screens; `label`: what the link says to screen readers;
// `icon`: show a small phone icon in front.
export default function PhoneNumber({ phone, className, label, icon = false }) {
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const glyph = icon && <Phone size={14} aria-hidden="true" />;

  if (touch) {
    return (
      <a className={className} href={telHref(phone)} aria-label={label}>
        {glyph} {phone}
      </a>
    );
  }

  return (
    <span className="phone-copy">
      <span className="phone-copy__number">{glyph} {phone}</span>
      <button
        type="button"
        className="link-btn phone-copy__btn"
        onClick={async () => setCopied(await copyText(phone))}
        aria-label={copied ? `Copied ${phone}` : `Copy ${phone}`}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </span>
  );
}
