import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { $fetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: (config.public as any)?.apiBase || 'http://localhost:4000',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    onRequest({ options }) {
      // Ejemplo para añadir token si lo tuvieras en una store/cookie
      // const token = useAuthStore().token
      // if (token) {
      //   options.headers = { ...(options.headers as any), Authorization: `Bearer ${token}` }
      // }
    },
    onResponse({ response }) {
      // Puedes hacer logging o normalización de respuestas aquí si lo deseas
      return response._data
    },
    onResponseError({ response }) {
      // Manejo global de errores (401, 403, 500, etc.)
      // if (response.status === 401) useAuthStore().logout()
    },
  })

  return {
    provide: {
      api,
    },
  }
})
