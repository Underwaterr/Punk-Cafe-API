import prisma from '#prisma'
import { processImage } from '../../services/image/process.ts'

let select = {
  id: true,
  caption: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarPath: true,
    },
  },
  images: {
    select: {
      id: true,
      imagePath: true,
      thumbnailPath: true,
      width: true,
      height: true,
      position: true,
    },
    orderBy: { position: 'asc' as const },
  },
} as const

export default {
  async create(authorId: string, caption: string | null, file: Buffer) {
    let image = await processImage(file)

    return prisma.post.create({
      data: {
        authorId,
        caption,
        images: {
          create: {
            imagePath: image.imagePath,
            thumbnailPath: image.thumbnailPath,
            width: image.width,
            height: image.height,
          },
        },
      },
      select,
    })
  },
  getAll() {
    return prisma.post.findMany({
      select,
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  },
  getById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      select,
    })
  },
}
