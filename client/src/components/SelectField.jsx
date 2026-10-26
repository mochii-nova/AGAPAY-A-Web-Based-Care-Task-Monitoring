// A label, a dropdown, an optional hint and an error message, all linked for screen readers.
// options: [{ value, label }]
export default function SelectField({ id, name, label, value, onChange, options, hint, error, required = false, disabled }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        name={name}
        className="field__input select"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field__error">{error}</p>}
    </div>
  );
}
