<script setup>
/**
 * AppTopBar — top navigation bar shared by Dashboard / Workspace / Settings.
 *
 * Premium language:
 * - Sticky translucent shell.
 * - Slate/orange visual system.
 * - Soft border and controlled shadow.
 * - Keeps title/actions flexible through slots.
 */
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-black/20"
  >
    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
    >
      <!-- Title slot -->
      <div class="min-w-0 flex-1">
        <slot name="title" />
      </div>

      <!-- Actions slot -->
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>