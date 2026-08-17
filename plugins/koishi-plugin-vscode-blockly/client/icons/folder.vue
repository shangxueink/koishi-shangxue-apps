<template>
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1.5 3.5h4l1.5 2h7.5v7h-13z" :fill="open ? '#3a3d41' : 'none'" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ open?: boolean }>(), { open: false })
</script>
