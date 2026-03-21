import prisma from '#prisma'

export default {
  create(postId:string, userId:string) {
    return prisma.like.create({
      data: { postId, userId },
    })
  },
  remove(postId:string, userId:string) {
    return prisma.like.delete({
      where: { postId_userId: { postId, userId }, },
    })
  },
}
