import prisma from '#prisma'

export default {
  getAll() { return prisma.user.findMany() },
  getById(id) { return prisma.user.findUnique({ where: { id } }) }
}
