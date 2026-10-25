import { useState } from 'react';
import { CircleCheck, Send } from 'lucide-react';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

const EMPTY = { name: '', email: '', subject: '', message: '' };

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`contact-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    // TODO: the backend has no contact route yet, so nothing is sent for now.
    setSentTo({ name: form.name.trim(), email: form.email.trim() });
    setForm(EMPTY);
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
          <p className="contact__intro">Questions about AGAPAY or Orchid Carehome? Send us a message.</p>
          <dl className="contact__list">
            <div>
              <dt>Phone</dt>
              <dd><a href="tel:+63755290256">(075) 529 0256</a></dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd><address>301 Bolosan Old Road, Dagupan City, Pangasinan</address></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd><a href="mailto:ctrlsiapray@gmail.com">ctrlsiapray@gmail.com</a></dd>
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
              <div className="form-grid">
                {field('name', 'Your name', { placeholder: 'e.g. Juan Dela Cruz', autoComplete: 'name' })}
                {field('email', 'Your email', { type: 'email', placeholder: 'e.g. juan.delacruz@gmail.com', autoComplete: 'email' })}
              </div>
              {field('subject', 'Subject', { placeholder: 'e.g. Question about visiting hours' })}
              {field('message', 'Message', { as: 'textarea', placeholder: 'Write your message here', className: 'contact__message' })}
              <div className="contact__actions">
                <p className="contact__hint">All fields are required.</p>
                <button type="submit" className="btn btn--primary">
                  <Send size={16} aria-hidden="true" /> Send message
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
