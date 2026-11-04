import PasswordInput from './PasswordInput';

// A label, its input, an optional hint and an error message, all linked for screen readers.
// `icon`: a lucide icon shown inside the box on the left (Sign in and Register use these).
export default function FormField({ id, label, error, hint, required = true, type = 'text', icon: Icon, ...inputProps }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const shared = { id, required, 'aria-invalid': !!error, 'aria-describedby': describedBy, ...inputProps };
  const input = type === 'password' ? <PasswordInput {...shared} /> : <input type={type} className="field__input" {...shared} />;

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {Icon ? (
        <div className="field__control">
          <Icon size={20} className="field__icon" aria-hidden="true" />
          {input}
        </div>
      ) : (
        input
      )}
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field__error">{error}</p>}
    </div>
  );
}
