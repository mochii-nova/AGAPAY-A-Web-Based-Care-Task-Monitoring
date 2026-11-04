// Title row at the top of every page inside the app.
// `titleExtra` sits right next to the title (e.g. a "Sample data" tag); `children` go on the right.
export default function PageHeader({ title, titleExtra, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <div className="page-header__title-row">
          <h1>{title}</h1>
          {titleExtra}
        </div>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  );
}
