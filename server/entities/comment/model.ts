import prisma from '#prisma'

let select = {
  id: true,
  body: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarPath: true,
    },
  },
} as const

export default {
  create(postId: string, authorId: string, body: string) {
    return prisma.comment.create({
      data: { postId, authorId, body },
      select,
    })
  },
  getById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      select: { ...select, postId: true },
    })
  },
  getByPostId(postId: string) {
    return prisma.comment.findMany({
      where: { postId },
      select,
      orderBy: { createdAt: 'asc' },
    })
  },
  update(id: string, body: string) {
    return prisma.comment.update({
      where: { id },
      data: { body },
      select,
    })
  },
  remove(id: string) {
    return prisma.comment.delete({
      where: { id },
    })
  }
}
