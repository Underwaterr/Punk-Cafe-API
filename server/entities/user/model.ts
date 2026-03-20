import prisma from '#prisma'

let select = { id: true, username: true, displayName: true, avatarPath: true, createdAt: true } as const
let orderBy = { createdAt: 'desc' }

export default {
  getAll() { 
    return prisma.user.findMany({ 
      select, 
      orderBy 
    })
  },
  getById(id) { 
    return prisma.user.findUnique({ 
      where: { id }, 
      select 
    }) 
  }
}
