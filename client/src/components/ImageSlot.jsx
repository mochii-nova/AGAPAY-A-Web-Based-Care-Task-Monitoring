// Shows a picture from assets/images/index.js,
// or a labelled lavender box (same size) until the real file is added.
export default function ImageSlot({ image, alt, className = '', style }) {
  if (image.src) {
    return <img src={image.src} alt={alt ?? image.label} className={`image-slot ${className}`} style={style} />;
  }

  return (
    <div className={`image-slot image-slot--empty ${className}`} style={style} role="img" aria-label={alt ?? image.label}>
      <span>{image.label}</span>
    </div>
  );
}
