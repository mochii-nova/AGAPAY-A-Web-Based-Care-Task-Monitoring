import { Heart } from 'lucide-react';
import ImageSlot from '../ImageSlot';
import { images } from '../../assets/images';

const TEAM = [
  'Aeron Supremido',
  'Veronica Abalos',
  'Gianem Austria',
  'Princess Joy Cruz',
  'Alodia Yssa Belle De Guzman',
  'Charissa Panotes',
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__top">
        <div className="site-footer__brand">
          <ImageSlot image={images.logoWhite} alt="AGAPAY" style={{ width: 200, height: 56 }} />
          <p>Care is better when it's shared.</p>
        </div>

        <div>
          <h3>Reference</h3>
          <p>Orchid Carehome Inc.</p>
          <p>Bolosan Old Road, Dagupan City</p>
        </div>

        <div>
          <h3>Developed by</h3>
          <p>CTRL + SIA + PRAY</p>
          <p>BSIT 3 · Universidad de Dagupan</p>
        </div>

        <div>
          <h3>Team</h3>
          <ul className="site-footer__team">
            {TEAM.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>© 2026 AGAPAY. All Rights Reserved.</p>
        <p>
          Made with <Heart size={16} className="site-footer__heart" fill="currentColor" aria-hidden="true" />
          <span className="sr-only">love</span> for Caregivers
        </p>
      </div>
    </footer>
  );
}
