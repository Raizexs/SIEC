<script setup>
import { computed } from 'vue';
import { CheckCircle2, Circle } from 'lucide-vue-next';

const props = defineProps({
  password: {
    type: String,
    default: '',
  },
});

const passwordValue = computed(() => props.password || '');

const score = computed(() => {
  let value = 0;
  const password = passwordValue.value;

  if (password.length >= 8) value += 1;
  if (password.length >= 12) value += 1;
  if (/[A-Z]/.test(password)) value += 1;
  if (/[0-9]/.test(password)) value += 1;
  if (/[^A-Za-z0-9]/.test(password)) value += 1;

  return Math.min(value, 4);
});

const strengthMeta = computed(() => {
  const states = [
    {
      label: 'Muy débil',
      text: 'text-red-600 dark:text-red-300',
      bar: 'bg-red-500',
      chip: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300',
    },
    {
      label: 'Débil',
      text: 'text-orange-600 dark:text-orange-300',
      bar: 'bg-orange-500',
      chip: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/25 dark:text-orange-300',
    },
    {
      label: 'Regular',
      text: 'text-amber-600 dark:text-amber-300',
      bar: 'bg-amber-500',
      chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300',
    },
    {
      label: 'Buena',
      text: 'text-emerald-600 dark:text-emerald-300',
      bar: 'bg-emerald-500',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300',
    },
    {
      label: 'Excelente',
      text: 'text-emerald-600 dark:text-emerald-300',
      bar: 'bg-emerald-500',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300',
    },
  ];

  return states[score.value];
});

const requirements = computed(() => [
  {
    ok: passwordValue.value.length >= 8,
    label: 'Mínimo 8 caracteres',
  },
  {
    ok: /[A-Z]/.test(passwordValue.value),
    label: 'Una mayúscula',
  },
  {
    ok: /[0-9]/.test(passwordValue.value),
    label: 'Un número',
  },
  {
    ok: /[^A-Za-z0-9]/.test(passwordValue.value),
    label: 'Un símbolo',
  },
]);
</script>

<template>
  <transition name="password-strength">
    <section
      v-if="password"
      class="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      aria-live="polite"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <p
          class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
        >
          Seguridad de contraseña
        </p>

        <span
          class="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight"
          :class="strengthMeta.chip"
        >
          {{ strengthMeta.label }}
        </span>
      </div>

      <!-- Strength bars -->
      <div
        class="grid grid-cols-4 gap-1.5"
        role="meter"
        :aria-valuenow="score"
        aria-valuemin="0"
        aria-valuemax="4"
        :aria-label="`Nivel de seguridad: ${strengthMeta.label}`"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        >
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="i <= score ? strengthMeta.bar : 'bg-transparent'"
          ></div>
        </div>
      </div>

      <!-- Requirements -->
      <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <li
          v-for="requirement in requirements"
          :key="requirement.label"
          class="flex items-center gap-2 text-xs font-bold transition-colors duration-200"
          :class="
            requirement.ok
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-slate-400 dark:text-slate-500'
          "
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors duration-200"
            :class="
              requirement.ok
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/25'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
            "
          >
            <CheckCircle2
              v-if="requirement.ok"
              class="h-3.5 w-3.5"
              :stroke-width="2.4"
            />

            <Circle
              v-else
              class="h-3.5 w-3.5"
              :stroke-width="2"
            />
          </span>

          {{ requirement.label }}
        </li>
      </ul>
    </section>
  </transition>
</template>

<style scoped>
.password-strength-enter-active,
.password-strength-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.password-strength-enter-from,
.password-strength-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>