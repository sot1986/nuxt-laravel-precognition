<script setup lang="ts">
import { useForm } from '#imports'

const newPost = useForm('post', () => 'api/posts', { title: '', content: '' })
</script>

<template>
  <div>
    <h1>Test</h1>
    <form
      @submit.prevent="newPost.submit()"
      @reset.prevent="newPost.reset()"
    >
      <fieldset>
        <input
          id="title"
          v-model="newPost.title"
          name="title"
          type="text"
          @change="newPost.validate('title')"
        >
        <p v-if="newPost.invalid('title')" id="title-error">
          {{ newPost.errors.title }}
        </p>
        <textarea
          id="content"
          v-model="newPost.content"
          name="content"
          cols="30"
          rows="10"
          @change="newPost.validate('content')"
        />
        <p v-if="newPost.invalid('content')" id="content-error">
          {{ newPost.errors.content }}
        </p>
      </fieldset>
      <div>
        <button id="reset" type="reset">
          Reset
        </button>
        <button id="save">
          Save
        </button>
      </div>
    </form>
  </div>
</template>
