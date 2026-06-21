<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRecintosStore } from '../stores/recintos';
import { useNormativa } from '../composables/useNormativa';

const props = defineProps({
  materialEstructuralId: { type: Number, default: 1 },
  m2Totales: { type: Number, default: 0 },
  alturaMuroM: { type: Number, default: 2.4 },
});

const emit = defineEmits(['ley21725-violation']);

const recintosStore = useRecintosStore();
const { lastResult, loading, validarNormativa } = useNormativa();
const expanded = ref(true);

const runValidation = async () => {
  const walls = recintosStore.recintos?.length
    ? recintosStore.recintos.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        piso: r.piso || 1,
        material_id: r.materialEstructuralId ?? props.materialEstructuralId,
        height_m: r.dimensions?.h ?? props.alturaMuroM,
        area_m2: (r.dimensions?.w ?? 0) * (r.dimensions?.l ?? 0),
      }))
    : [];

  const data = await validarNormativa({
    m2_totales: props.m2Totales,
    material_estructural_id: props.materialEstructuralId,
    altura_muro_m: props.alturaMuroM,
    recintos: walls,
    muros: [],
  });

  const leyAlert = data?.alerts?.find((a) => a.code?.startsWith('LEY_21725'));
  if (leyAlert?.severity === 'error') {
    emit('ley21725-violation', leyAlert);
  }
};

onMounted(() => {
  void runValidation();
});

watch(
  () => [props.materialEstructuralId, props.m2Totales, recintosStore.recintos.length],
  () => {
    void runValidation();
  },
);

const alerts = computed(() => lastResult.value?.alerts ?? []);
const injections = computed(() => lastResult.value?.injections ?? []);
const compliant = computed(() => lastResult.value?.compliant !== false);
</script>

<template>
  <section
    data-motion="card"
    class="rounded-3xl border border-slate-200/90 bg-white/80 shadow-sm dark:border-slate-800/90 dark:bg-slate-950/60"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-orange-500">gavel</span>
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Normativa Chile 2026
          </p>
          <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ compliant ? 'Referencia y validaciones' : 'Revisar cumplimiento' }}
          </p>
        </div>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
        :class="
          compliant
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
        "
      >
        {{ loading ? '…' : compliant ? 'OK' : 'Alertas' }}
      </span>
    </button>

    <div v-show="expanded" class="space-y-3 border-t border-slate-200/80 px-4 py-3 dark:border-slate-800/80">
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Referencias: LOSCAT (térmico), LOSCAA (acústico/fuego), Ley 21.725 (vivienda social),
        OGUC (alturas mínimas), hormigón H20 en cadenas.
      </p>

      <ul v-if="alerts.length" class="space-y-2">
        <li
          v-for="(alert, idx) in alerts"
          :key="idx"
          class="rounded-xl border px-3 py-2 text-xs"
          :class="
            alert.severity === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
          "
        >
          <strong>{{ alert.code }}:</strong> {{ alert.message }}
        </li>
      </ul>

      <ul v-if="injections.length" class="space-y-2">
        <li
          v-for="(item, idx) in injections"
          :key="'inj-' + idx"
          class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100"
        >
          <strong>{{ item.normativa || item.norma || item.codigo }}:</strong>
          {{ item.mensaje || item.descripcion || item.sugerencia }}
        </li>
      </ul>

      <p v-if="!alerts.length && !injections.length && !loading" class="text-xs text-slate-500">
        Sin observaciones normativas para el diseño actual.
      </p>
    </div>
  </section>
</template>
