import prisma from '#prisma'
import { processImage, deleteImages } from '../../image-process.ts'

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
  _count: {
    select: {
      likes: true,
      comments: true,
    }
  }
} as const

export default {

  async create(authorId:string, caption:string | null, file:Buffer) {
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

  getFeed(userId:string, take:number=20, cursor?:string) {
    return prisma.post.findMany({
      select: {
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
        _count: {
          select: {
            likes: true,
            comments: true,
          }
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })
  },

  getByIdForUser(id:string, userId:string) {
    return prisma.post.findUnique({
      where: { id },
      select: {
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
        _count: {
          select: {
            likes: true,
            comments: true,
          }
        },
        likes: {
          where: { userId },
          select: { id: true },
        }
      }
    })
  },
  getById(id:string ) {
    return prisma.post.findUnique({
      where: { id },
      select
    })
  },
  async remove(id:string) {
    let post = await prisma.post.findUnique({
      where: { id },
      include: { images: true },
    })
    if (!post) return null
    await deleteImages(post.images)
    await prisma.post.delete({ where: { id } })
    return post
  }
}
