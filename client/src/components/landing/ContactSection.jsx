import { useState } from 'react';
import { Phone, MapPin, Mail, CircleCheck } from 'lucide-react';
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

  // One labelled input with its error message underneath
  const field = (name, label, props) => (
    <div className="field">
      <label htmlFor={`contact-${name}`} className="field__label">
        {label} <span className="field__required" aria-hidden="true">*</span>
      </label>
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
    <section id="contact" className="contact">
      <div className="contact__panel">
        <div className="contact__info">
          <h2 className="contact__title">Contact Us</h2>
          <ul className="contact__list">
            <li>
              <span className="contact__icon" aria-hidden="true"><Phone size={18} /></span>
              <div><small>Phone</small><a href="tel:+63755290256">(075) 529 0256</a></div>
            </li>
            <li>
              <span className="contact__icon" aria-hidden="true"><MapPin size={18} /></span>
              <div>
                <small>Address</small>
                <address>
                  <span>301 Bolosan Old Rd,</span> <span>Dagupan City,</span> <span>Pangasinan, Philippines</span>
                </address>
              </div>
            </li>
            <li>
              <span className="contact__icon" aria-hidden="true"><Mail size={18} /></span>
              <div><small>Email</small><a href="mailto:ctrlsiapray@gmail.com">ctrlsiapray@gmail.com</a></div>
            </li>
          </ul>
        </div>
        <ImageSlot image={images.contact} className="contact__photo" />
      </div>

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
            <p className="contact__hint">Fields marked * are required.</p>
            {field('name', 'Your name', { placeholder: 'Enter your name', autoComplete: 'name' })}
            {field('email', 'Your email', { type: 'email', placeholder: 'Enter your email', autoComplete: 'email' })}
            {field('subject', 'Subject', { placeholder: 'What is your message about?' })}
            {field('message', 'Message', { as: 'textarea', placeholder: 'Write your message here…' })}
            <button type="submit" className="btn btn--primary">Send Message</button>
          </form>
        )}
      </div>
    </section>
  );
}
