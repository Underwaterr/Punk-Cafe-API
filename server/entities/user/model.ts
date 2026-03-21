import prisma from '#prisma'

let select = { id: true, username: true, displayName: true, avatarPath: true, createdAt: true } as const

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

  updateAvatar(id: string, avatarPath: string) {
    return prisma.user.update({
      where: { id },
      data: { avatarPath },
      select,
    })
  }
}
