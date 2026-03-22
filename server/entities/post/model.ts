import prisma from '#prisma'
import { processImage, deleteImages } from '#process-image'

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

let postSelect = function(userId?:string) {
  if (userId) return { 
    ...select,
    likes: { where: { userId }, select: { id: true } }
  }
  else return select
}

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
      select: postSelect(userId),
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })
  },

  getByIdForUser(id:string, userId:string) {
    return prisma.post.findUnique({
      where: { id },
      select: postSelect(userId),
    })
  },
  getById(id:string ) {
    return prisma.post.findUnique({
      where: { id },
      select: postSelect(),
    })
  },
  updateCaption(id: string, caption: string | null) {
    return prisma.post.update({
      where: { id },
      data: { caption },
      select,
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
