<script setup>
import { ref, onErrorCaptured } from 'vue';
import logger from '../utils/logger.js';

const hasError = ref(false);
const errorMessage = ref('');

onErrorCaptured((err, instance, info) => {
  hasError.value = true;
  errorMessage.value = err?.message || 'Error inesperado';
  logger.error('[ErrorBoundary] Error capturado en árbol de componentes:', err, { info });
  // Retornar false evita que el error se propague hacia arriba
  return false;
});

const reload = () => {
  window.location.reload();
};
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-boundary__card">
      <div class="error-boundary__icon">⚠️</div>
      <h2 class="error-boundary__title">Algo salió mal</h2>
      <p class="error-boundary__message">
        {{ errorMessage || 'Ocurrió un error inesperado en la aplicación.' }}
      </p>
      <p class="error-boundary__hint">
        Si el problema persiste, recarga la página o contacta al soporte.
      </p>
      <button class="error-boundary__btn" @click="reload">
        Recargar página
      </button>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-bg, #0f1117);
  padding: 2rem;
}

.error-boundary__card {
  max-width: 480px;
  width: 100%;
  background: var(--color-surface, #1a1d27);
  border: 1px solid var(--color-border, #2a2d3a);
  border-radius: 12px;
  padding: 2.5rem 2rem;
  text-align: center;
  color: var(--color-text, #e2e8f0);
}

.error-boundary__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-boundary__title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--color-text-primary, #f1f5f9);
}

.error-boundary__message {
  font-size: 0.9rem;
  color: var(--color-text-muted, #94a3b8);
  margin: 0 0 0.5rem;
  font-family: monospace;
  background: var(--color-bg, #0f1117);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  word-break: break-word;
}

.error-boundary__hint {
  font-size: 0.85rem;
  color: var(--color-text-muted, #64748b);
  margin: 0.75rem 0 1.5rem;
}

.error-boundary__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.5rem;
  background: var(--color-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.error-boundary__btn:hover {
  opacity: 0.88;
}
</style>
