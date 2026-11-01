import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Send, Copy, Check } from 'lucide-react';
import api from '../../api';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';
import useSaving from '../../hooks/useSaving';
import { copyText } from '../../utils/clipboard';

const EMAIL = 'ctrlsiapray123@gmail.com';

// `website` is a hidden trap: people never see it, simple spam bots fill it in
const EMPTY = { name: '', email: '', subject: '', message: '', website: '' };

// Returns an error message for each field that is filled in wrong
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your name.';
  if (!form.email.trim()) errors.email = 'Please enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Please enter a valid email, like name@example.com.';
  if (!form.subject.trim()) errors.subject = 'Please enter a subject.';
  if (!form.message.trim()) errors.message = 'Please write your message.';
  return errors;
}

export default function ContactSection() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sentTo, setSentTo] = useState(null);
  const [sending, setSending, startSending] = useSaving();
  const [sendError, setSendError] = useState('');
  const [copied, setCopied] = useState(false);

  // "Copy" next to the email shows "Copied" for 2 seconds
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyEmail = async () => setCopied(await copyText(EMAIL));

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`contact-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    if (!startSending()) return;
    setSendError('');
    try {
      // The backend keeps name, email and message, so the subject goes on top of the message
      await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        message: `Subject: ${form.subject.trim()}\n\n${form.message.trim()}`,
        website: form.website,
      });
      setSentTo({ name: form.name.trim(), email: form.email.trim() });
      setForm(EMPTY);
    } catch (err) {
      setSendError(
        err.response
          ? err.response.data?.message || "Your message couldn't be sent. Please try again."
          : "Your message couldn't be sent right now. Please try again later, or email us instead."
      );
    } finally {
      setSending(false);
    }
  };

  // One labelled input with its error message underneath (all fields are required)
  const field = (name, label, props) => (
    <div className={`field ${props.className ?? ''}`}>
      <label htmlFor={`contact-${name}`} className="field__label">{label}</label>
      {props.as === 'textarea' ? (
        <textarea
          id={`contact-${name}`} name={name} rows={4} className="field__input"
          value={form[name]} onChange={handleChange} placeholder={props.placeholder}
          required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
        />
      ) : (
        <input
          id={`contact-${name}`} name={name} type={props.type ?? 'text'} className="field__input"
          value={form[name]} onChange={handleChange} placeholder={props.placeholder} autoComplete={props.autoComplete}
          required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
        />
      )}
      {errors[name] && <p id={`contact-${name}-error`} className="field__error">{errors[name]}</p>}
    </div>
  );

  return (
    <section id="contact" className="section contact">
      <div className="container contact__grid">
        {/* Left: contact details, then the photo */}
        <div className="contact__panel">
          <p className="eyebrow">Contact</p>
          <h2 className="contact__title">Get in touch</h2>
          <p className="contact__intro">Questions about AGAPAY? Send us a message.</p>
          {/* Only the team's own details (the phone and street address belong to the reference facility) */}
          <dl className="contact__list">
            <div>
              <dt>Email</dt>
              <dd className="contact__email">
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                <button type="button" className="link-btn contact__copy" onClick={copyEmail} aria-label={copied ? `Copied ${EMAIL}` : `Copy ${EMAIL}`}>
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </dd>
            </div>
            <div>
              <dt>Where we are</dt>
              <dd><address>Universidad de Dagupan, Dagupan City</address></dd>
            </div>
          </dl>
          <ImageSlot image={images.contact} className="contact__photo" />
        </div>

        {/* Right: the form */}
        <div className="contact__form-wrap">
          {sentTo ? (
            <div className="contact__success" role="status">
              <CircleCheck size={48} aria-hidden="true" />
              <h3>Thank you, {sentTo.name}!</h3>
              <p>Your message has been sent. We'll reply to <strong>{sentTo.email}</strong> as soon as we can.</p>
              <button type="button" className="btn btn--outline" onClick={() => setSentTo(null)}>
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact__form" onSubmit={handleSubmit} noValidate>
              {sendError && (
                <div className="alert alert--error" role="alert">
                  <CircleAlert size={18} aria-hidden="true" />
                  <span>{sendError}</span>
                </div>
              )}
              {/* Spam trap: hidden from people and screen readers */}
              <div className="contact__trap" aria-hidden="true">
                <label htmlFor="contact-website">Leave this empty</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
              </div>
              <div className="form-grid">
                {field('name', 'Your name', { placeholder: 'e.g. Liza Villanueva', autoComplete: 'name' })}
                {field('email', 'Your email', { type: 'email', placeholder: 'e.g. paolo.villanueva@example.com', autoComplete: 'email' })}
              </div>
              {field('subject', 'Subject', { placeholder: 'e.g. Question about AGAPAY' })}
              {field('message', 'Message', { as: 'textarea', placeholder: 'Write your message here', className: 'contact__message' })}
              <div className="contact__actions">
                <p className="contact__hint">All fields are required.</p>
                <button type="submit" className="btn btn--primary" disabled={sending}>
                  <Send size={16} aria-hidden="true" /> {sending ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
