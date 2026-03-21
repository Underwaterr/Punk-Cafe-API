import prisma from '#prisma'
import generateCode from '#server/generate-code.ts'

export default {
  create(invitedBy:string) {
    return prisma.invitation.create({
      data: {
        code: generateCode(),
        invitedBy,
      },
    })
  },
  getByUser(invitedBy:string) {
    return prisma.invitation.findMany({
      where: { invitedBy },
      orderBy: { createdAt: 'desc' },
    })
  },
}
