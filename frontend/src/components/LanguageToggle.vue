<template>
  <button type="button" class="lang-toggle" @click="toggleLocale">
    {{ locale === 'ar' ? 'EN' : 'AR' }}
  </button>
</template>

<script setup>
import { locale, toggleLocale } from '@/i18n';
</script>