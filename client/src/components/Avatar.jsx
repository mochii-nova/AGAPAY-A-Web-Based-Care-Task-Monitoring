import { useState } from 'react';
import { initials } from '../utils/format';

// The one round avatar used everywhere: the person's profile photo, or their initials on lilac
// when there's no photo or it fails to load. `name` is the alt text.
export default function Avatar({ name, photo, size = 40 }) {
  const [failed, setFailed] = useState(null); // the photo address that didn't load
  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (photo && failed !== photo) {
    return <img className="avatar" src={photo} alt={name} style={style} onError={() => setFailed(photo)} />;
  }
  return (
    <span className="avatar" style={style} role="img" aria-label={name}>
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
