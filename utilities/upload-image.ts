import multer from 'multer'

const TWENTY_FIVE_MEGABYTES = 25 * 1024 * 1024

export default multer({
  // memory storage instead of disk
  // we'll pipe image data thru Sharp before storing on disk
  storage: multer.memoryStorage(),
  limits: { fileSize: TWENTY_FIVE_MEGABYTES, files: 1 },
  fileFilter(_request, file, callback) {
    let allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (allowed.includes(file.mimetype)) callback(null, true)
    else callback(new Error('Only JPEG, PNG, WebP and HEIC images are allowed'))
  },
})
