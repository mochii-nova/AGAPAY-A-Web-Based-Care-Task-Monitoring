// Turns a chosen photo into a small square JPEG (centre crop), so it's quick to show
// and quick to upload. Resolves to a data URL.
export function squarePhoto(file, size = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file can't be opened as a photo. Please choose a JPG or PNG image."));
    };

    img.src = url;
  });
}
