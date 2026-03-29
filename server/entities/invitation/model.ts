import prisma from '#prisma'
import generateCode from '#generate-code'

export default {
  create(invitedBy:string, realName:string) {
    return prisma.invitation.create({
      data: {
        code: generateCode(),
        invitedBy,
        realName
      }
    })
  },
  getByUser(invitedBy:string) {
    return prisma.invitation.findMany({
      where: { invitedBy },
      orderBy: { createdAt: 'desc' }
    })
  },
  remove(id:string) {
    return prisma.invitation.delete({
      where: { id }
    })
  }
}
