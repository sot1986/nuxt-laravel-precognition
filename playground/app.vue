<!-- eslint-disable no-console -->
<!-- eslint-disable unused-imports/no-unused-imports -->
<script setup lang="ts">
import { z } from 'zod'
import { computed, onMounted, ref, useAsyncData, useCookie, useForm, useNuxtApp } from '#imports'

defineOptions({
  name: 'PlaygroundHome',
  inheritAttrs: false,
})

function getCsrfToken() {
  return useCookie('XSRF-TOKEN', { default: () => '' }).value
}

function addHeader(options: { headers?: HeadersInit }, key: string, value: string) {
  if (options.headers instanceof Headers) {
    options.headers.append(key, value)
    return
  }

  if (Array.isArray(options.headers)) {
    options.headers.push([key, value])
    return
  }

  options.headers = { ...options.headers, [key]: value }
}

const api = $fetch.create({
  baseURL: 'http://localhost',
  headers: {
    Accept: 'application/json',
  },
  credentials: 'include',
  onRequest: ({ options }) => {
    const csrfToken = getCsrfToken()

    if (!csrfToken)
      return

    addHeader(options, 'X-XSRF-TOKEN', csrfToken)
  },
})

const { $precognition } = useNuxtApp()

$precognition.client.use(api)

function fetchCsrfToken() {
  return api('/sanctum/csrf-cookie')
}

const PostsSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
    friends: z.array(z.string()).nullish(),
  })),
})

const newPost = useForm('post', 'api/posts', { title: '', content: '', friends: [] as string[] })

onMounted(fetchCsrfToken)

const avatar = useForm<{
  avatar: null | File
  size: number
  name: string
  type: File['type']
}>('post', 'api/avatar', { avatar: null, size: 0, name: '', type: '' }, {
  bodyAs,
})

function tryUpload(e: Event) {
  const { files } = e.target as HTMLInputElement

  const file = files?.item(0)
  if (!file) {
    avatar.reset()
    return
  }

  avatar.name = file.name
  avatar.size = file.size
  avatar.type = file.type
  avatar.avatar = file

  avatar.touch('name')
  avatar.touch('size')
  avatar.touch('type')
  avatar.touch('avatar')
  avatar.validate()
}

function bodyAs(data: Record<string, unknown>) {
  const formData = new FormData()
  if ('name' in data)
    formData.append('name', String(data.name))
  if ('size' in data)
    formData.append('size', String(data.size))
  if ('type' in data)
    formData.append('type', String(data.type))

  if ('avatar' in data)
    formData.append('avatar', data.avatar as File)

  return formData
}

function submitAvatar() {
  if (!avatar.avatar)
    return

  avatar.submit({ bodyAs })
}
</script>

<template>
  <div class="container mx-auto mt-10 divide-y-2 space-y-4">
    <form>
      <fieldset class="flex flex-col gap-4">
        <div class="flex flex-col gap-y-1">
          <label for="title">Title</label>
          <input
            id="title" v-model="newPost.title" type="text"
            name="title"
            class="max-w-sm rounded shadow border border-gray-300 py-1 px-2"
            @change="newPost.validate('title')"
          >
          <p v-if="newPost.errors.title && newPost.invalid('title')" class="text-red-500">
            {{ newPost.errors.title }}
          </p>
        </div>
        <div class="flex flex-col gap-y-1">
          <label for="content">Content</label>
          <textarea id="content" v-model="newPost.content" name="content" cols="30" rows="10" class="max-w-sm rounded shadow border border-gray-300 py-1 px-2" @change="newPost.validate('content')" />
          <p v-if="newPost.errors.content && newPost.invalid('content')" class="text-red-500">
            {{ newPost.errors.content }}
          </p>
        </div>
      </fieldset>
    </form>
  </div>
</template>
