<template>
  <div class="app">
    <HU10Panel />
  </div>
</template>

<script setup>
import HU10Panel from './components/HU10Panel.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app {
  width: 100%;
  min-height: 100vh;
}
</style>
