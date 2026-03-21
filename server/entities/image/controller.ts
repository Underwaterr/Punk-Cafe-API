import type { Request, Response } from 'express'
import path from 'node:path'
import { access } from 'node:fs/promises'

export default {
  async get(request:Request, response:Response) {
    let { directory, filename } = request.params
    if (typeof directory != 'string') return response.status(400).json({ error: 'Missing directory' })
    if (typeof filename != 'string') return response.status(400).json({ error: 'Missing filename' })

    let validDirectoryRegex = /^(posts|thumbnails|avatars)$/
    let isValidDirectory = validDirectoryRegex.test(directory)
    if (!isValidDirectory) return response.status(400).json({ error: 'Invalid directory' })

    let validFilenameRegex = /^[\w\-]+\.webp$/
    let isValidFilename = validFilenameRegex.test(filename)
    if (!isValidFilename) return response.status(400).json({ error: 'Invalid directory' })

    // prevent directory traversal
    let filePath = path.resolve(process.env.UPLOAD_DIRECTORY, directory, filename)
    let uploadPath = path.resolve(process.env.UPLOAD_DIRECTORY) 
    let isTraversing = !filePath.startsWith(uploadPath)
    if (isTraversing) return response.status(403).json({ error: 'Forbidden' })

    try { await access(filePath) } 
    catch { return response.status(404).json({ error: 'Image not found' }) }

    return response.sendFile(filePath)
  }
}
