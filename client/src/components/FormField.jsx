import PasswordInput from './PasswordInput';

// A label, its input, an optional hint and an error message, all linked for screen readers
export default function FormField({ id, label, error, hint, required = true, type = 'text', ...inputProps }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const shared = { id, required, 'aria-invalid': !!error, 'aria-describedby': describedBy, ...inputProps };

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {type === 'password' ? <PasswordInput {...shared} /> : <input type={type} className="field__input" {...shared} />}
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field__error">{error}</p>}
    </div>
  );
}
