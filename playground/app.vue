<!-- eslint-disable unused-imports/no-unused-imports -->
<script setup lang="ts">
import { z } from 'zod'
import { computed, onMounted, ref, useAsyncData, useForm, useNuxtApp } from '#imports'

defineOptions({
  name: 'PlaygroundHome',
  inheritAttrs: false,
})

const { $fetchCsrfToken, $api } = useNuxtApp()

const PostsSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
    friends: z.array(z.string()).nullish(),
  })),
})

const { data: posts, refresh } = useAsyncData(() => $api('/api/posts'),
  {
    transform: payload => PostsSchema.parse(payload).data,
    default: () => [],
    server: false,
  })

const initialPost = computed(() => ({
  name: '',
  age: 0,
  friends: [] as string[],
}))

const form = useForm('post', 'api/people', () => initialPost.value)
const newFriend = ref('')

function deleteFriend(idx: number) {
  form.friends.splice(idx, 1)
}

async function addFriend() {
  form.friends.push(newFriend.value)

  await form.validate(`friends.${form.friends.length - 1}`)

  newFriend.value = ''
}

const ucName = computed(() => form.name.toUpperCase())

onMounted($fetchCsrfToken)

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

async function submitPeople() {
  const response = await form.submit({
    onSuccess: (resp) => {
      console.log('on success', resp)
      refresh()
    },
  })

  console.log('submit', response)
}

function submitAvatar() {
  if (!avatar.avatar)
    return

  avatar.submit({ bodyAs })
}
</script>

<template>
  <div class="container mx-auto mt-10 divide-y-2 space-y-4">
    {{ $precognition }}
    <form @submit.prevent="submitPeople" @reset.prevent="form.reset()">
      <fieldset
        class="space-y-6"
      >
        <div class="flex flex-col">
          <label for="name">Name</label>
          <input id="name" v-model="form.name" name="name" type="text" class="ring-1 rounded px-2 py-1 shadow shadow-gray-300 ring-gray-300" @change="form.validate('name')">
          <p v-if="form.invalid('name')">
            {{ form.errors.name }}
          </p>
        </div>

        <div>{{ ucName }}</div>

        <div class="flex flex-col">
          <label for="age">Age</label>
          <input id="age" v-model="form.age" name="age" type="number" step="1" class="ring-1 rounded px-2 py-1 shadow shadow-gray-300 ring-gray-300" @change="form.validate('age')">
          <p v-if="form.invalid('age')">
            {{ form.errors.age }}
          </p>
        </div>
      </fieldset>

      <fieldset class="mt-10">
        <ul>
          <li v-for="(friend, idx) in form.friends" :key="`friend-${idx + 1}`">
            <div class="space-x-2">
              <span>{{ friend }}</span>
              <button type="button" @click="deleteFriend(idx)">
                X
              </button>
            </div>
            <div v-if="form.invalid(`friends.${idx}`)">
              {{ form.errors[`friends.${idx}`] }}
            </div>
          </li>
        </ul>

        <div class="flex justify-between">
          <input id="new-friend" v-model="newFriend" name="new-friend" type="text" class="ring-1 rounded px-2 py-1 shadow shadow-gray-300 ring-gray-300">
          <button type="button" @click="addFriend()">
            Add Friends
          </button>
        </div>
      </fieldset>

      <div class="flex mt-6 gap-x-6">
        <button class="px-4 font-semibold text-gray-950 bg-gray-100 hover:bg-gray-50 ml-auto transition-colors rounded py-1" type="reset">
          Reset
        </button>
        <button class="px-4 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors rounded py-1">
          Create
        </button>
      </div>
    </form>

    <div class="py-10 sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Users
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          A list of all the users in your account including their name, title, email and role.
        </p>
      </div>
    </div>

    <div class="mt-10 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                  Title
                </th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Content
                </th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Friends
                </th>
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
                  <span class="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="post in posts" :key="post.id">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                  {{ post.title }}
                </td>
                <td class="px-3 py-4 text-xs text-gray-500 overflow-y-hidden">
                  <p class="line-clamp-2">
                    {{ post.content }}
                  </p>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {{ post.friends?.toString() }}
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                  <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit<span class="sr-only">, {{ post.title }}</span></a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <form @submit.prevent @reset.prevent>
      <div class="space-y-12 mt-20">
        <div class="border-b border-gray-900/10 pb-12">
          <h2 class="text-base font-semibold leading-7 text-gray-900">
            Profile
          </h2>
          <p class="mt-1 text-sm leading-6 text-gray-600">
            This information will be displayed publicly so be careful what you share.
          </p>

          <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div class="col-span-full">
              <label for="photo" class="block text-sm font-medium leading-6 text-gray-900">Photo</label>
              <div class="mt-2 flex items-center gap-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-12 w-12 text-gray-300" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>

                <button type="button" class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" @click="submitAvatar">
                  Change
                </button>
              </div>
            </div>

            <div class="col-span-full">
              <label for="cover-photo" class="block text-sm font-medium leading-6 text-gray-900">Cover photo</label>
              <div class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                <div class="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-12 w-12 text-gray-300" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>

                  <div class="mt-4 flex text-sm leading-6 text-gray-600">
                    <label for="file-upload" class="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" class="sr-only" @change="tryUpload">
                    </label>
                    <p class="pl-1">
                      or drag and drop
                    </p>
                  </div>
                  <p class="text-xs leading-5 text-gray-600">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
