import prisma from '#prisma'

let select = {
  id: true,
  lastActive: true,
  expiresAt: true,
  createdAt: true,
} as const

export default {
  getByUserId(userId:string) {
    return prisma.session.findMany({
      where: { userId },
      select,
      orderBy: { lastActive: 'desc' },
    })
  },
  getById(id:string) {
    return prisma.session.findUnique({
      where: { id },
    })
  },
  remove(id:string) {
    return prisma.session.delete({
      where: { id },
    })
  },
}
