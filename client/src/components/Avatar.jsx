import { initials } from '../utils/format';

// Round profile picture, or the person's initials when there's no photo
export default function Avatar({ name, photo, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (photo) return <img className="avatar" src={photo} alt="" style={style} />;
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
