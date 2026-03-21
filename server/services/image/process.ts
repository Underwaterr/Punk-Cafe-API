import sharp from 'sharp'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

let uploadDirectory = process.env.UPLOAD_DIRECTORY

function generateFilename(extension: string) {
  return randomBytes(16).toString('hex') + extension
}

export async function processImage(buffer: Buffer) {
  // get image dimensions and format
  let metadata = await sharp(buffer).metadata()

  // store with random filename for security
  let filename = generateFilename('.webp')
  let thumbnailFilename = 'thumbnail_' + filename

  let postDirectory = path.join(uploadDirectory, 'posts')
  let thumbnailDirectory = path.join(uploadDirectory, 'thumbs')

  // create the directories if they don't already exist
  await mkdir(postDirectory, { recursive: true })
  await mkdir(thumbnailDirectory, { recursive: true })

  let imagePath = path.join(postDirectory, filename)
  let thumbnailPath = path.join(thumbnailDirectory, thumbnailFilename)

  // full size — cap at 2048px on longest edge, convert to WebP
  // rotate before resizing since EXIF orientation tags will be stripped
  let image = sharp(buffer).rotate().webp({ quality: 80 })
  if ((metadata.width ?? 0) > 2048 || (metadata.height ?? 0) > 2048) {
    image = image.resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
  }
  await image.toFile(imagePath)

  // thumbnail — 400px on longest edge
  await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(thumbnailPath)

  // get dimensions of the processed full-size image
  let processed = await sharp(imagePath).metadata()

  return {
    imagePath: path.join('posts', filename),
    thumbnailPath: path.join('thumbnails', thumbnailFilename),
    width: processed.width ?? null,
    height: processed.height ?? null,
  }
}
