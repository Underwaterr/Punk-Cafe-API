import { baseUrl } from './test-utilities.ts'

export default {
  async get(endpoint: string) {
    return await fetch(baseUrl + endpoint)
  },
  async post(endpoint: string, body?: Record<string, unknown>) {
    return await fetch(baseUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  async postFormData(endpoint:string, body:FormData) {
    return await fetch(baseUrl + endpoint, {
      method: 'POST',
      body
    })
  },
  async put(endpoint: string, body: Record<string, unknown>) {
    return await fetch(baseUrl + endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  async delete(endpoint: string) {
    return await fetch(baseUrl + endpoint, { method: 'DELETE' })
  },
  withToken(token: string) {
    return {
      async get(endpoint: string) {
        return await fetch(baseUrl + endpoint, {
          headers: { 'Authorization': 'Bearer ' + token },
        })
      },
      async post(endpoint: string, body?: Record<string, unknown>) {
        return await fetch(baseUrl + endpoint, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })
      },
      async put(endpoint: string, body: Record<string, unknown>) {
        return await fetch(baseUrl + endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      },
      async delete(endpoint: string) {
        return await fetch(baseUrl + endpoint, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token },
        })
      },
      async uploadImage(endpoint: string, buffer: Buffer, filename: string, caption?: string) {
        let form = new FormData()
        let blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
        form.append('image', blob, filename)
        if (caption) form.append('caption', caption)
        return await fetch(baseUrl + endpoint, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: form,
        })
      },
    }
  },
}
