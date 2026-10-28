import Logo from '../Logo';

const TEAM = [
  'Aeron Supremido',
  'Veronica Abalos',
  'Gianem Austria',
  'Princess Joy Cruz',
  'Alodia De Guzman',
  'Charissa Panotes',
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__top">
        <div className="site-footer__brand">
          <Logo tone="white" height={34} />
          <p>Care is better when it’s shared.</p>
        </div>

        <div>
          <h3>Reference</h3>
          <p>Orchid Carehome Inc.</p>
          <p>Bolosan Old Road, Dagupan City</p>
        </div>

        <div>
          <h3>Developed by</h3>
          <p>CTRL + SIA + PRAY</p>
          <p>BSIT · Universidad de Dagupan</p>
        </div>

        <div>
          <h3>Team</h3>
          <ul className="site-footer__team">
            {TEAM.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>© 2026 AGAPAY. All rights reserved.</p>
        <p>Made with care for caregivers</p>
      </div>
    </footer>
  );
}
