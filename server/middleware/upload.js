// Profile photo upload: one JPG or PNG, max 5 MB, saved in server/uploads/photos/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'photos');
fs.mkdirSync(PHOTO_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: PHOTO_DIR,
    // Random name, so nobody can guess another person's photo address
    filename: (req, file, cb) => cb(null, `${req.user.id}-${crypto.randomBytes(8).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Please choose a JPG or PNG image.');
    err.status = 400;
    cb(err);
  },
}).single('photo');

// Checks the first bytes of the file, so a renamed file can't pretend to be an image
function looksLikeImage(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(8);
  fs.readSync(fd, head, 0, 8, 0);
  fs.closeSync(fd);
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return jpeg || png;
}

module.exports = { photoUpload, looksLikeImage, PHOTO_DIR };
