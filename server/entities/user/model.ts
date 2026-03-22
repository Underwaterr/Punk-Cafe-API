import prisma from '#prisma'
import { deleteAvatar, deleteImages } from '#process-image'

let select = { 
  id: true, 
  username: true,
  displayName: true,
  avatarPath: true,
  createdAt: true,
  pronouns: true,
  bio: true
} as const

export default {
  getAll() { 
    return prisma.user.findMany({ 
      select, 
      orderBy: { createdAt: 'desc' } 
    }) 
  },

  getById(id:string) { 
    return prisma.user.findUnique({ 
      where: { id }, 
      select 
    }) 
  },

  updateAvatar(id:string, avatarPath:string) {
    return prisma.user.update({
      where: { id },
      data: { avatarPath },
      select,
    })
  },

  updateProfile(id:string, data: { displayName?:string, pronouns?:string, bio?:string }) {
    return prisma.user.update({
      where: { id },
      data,
      select,
    })
  },

  async remove(id:string) {
    let user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: { include: { images: true } },
      },
    })

    if (!user) return null

    // delete all post images from disk
    let allImages = user.posts.flatMap(post => post.images)
    await deleteImages(allImages)

    // delete avatar from disk
    if (user.avatarPath) await deleteAvatar(user.avatarPath)

    // delete the user
    await prisma.user.delete({ where: { id } })

    return user
  }
}
