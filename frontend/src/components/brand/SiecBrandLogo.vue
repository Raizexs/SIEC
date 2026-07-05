<script setup>
import { computed, ref, watch } from 'vue';
import { useTheme } from '../../composables/useTheme';
import { getIsotipoLogo } from '../../constants/brandAssets';
import {
  loadHorizontalLogoInline,
  loadMonochromeLogoInline,
} from '../../constants/brandInlineSvg';
import { ensurePlusJakartaSans } from '../../utils/brandFonts';

const props = defineProps({
  /** horizontal | isotipo | monochrome */
  variant: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'isotipo', 'monochrome'].includes(value),
  },
  /** Fuerza modo oscuro (p. ej. landing siempre dark). */
  forceDark: { type: Boolean, default: null },
  alt: { type: String, default: 'SIEC' },
});

const { isDark } = useTheme();

const useDark = computed(() =>
  props.forceDark === null ? isDark.value : props.forceDark,
);

/** Los logos con <text> deben ir inline para usar Plus Jakarta Sans de la página. */
const usesInlineSvg = computed(
  () => props.variant === 'horizontal' || props.variant === 'monochrome',
);

const inlineSvg = ref('');

watch(
  [usesInlineSvg, useDark, () => props.variant],
  async () => {
    if (!usesInlineSvg.value) {
      inlineSvg.value = '';
      return;
    }

    const [markup] = await Promise.all([
      props.variant === 'monochrome'
        ? loadMonochromeLogoInline(useDark.value)
        : loadHorizontalLogoInline(useDark.value),
      ensurePlusJakartaSans(),
    ]);
    inlineSvg.value = markup;
  },
  { immediate: true },
);

const isotipoSrc = computed(() => {
  if (props.variant !== 'isotipo') return '';
  return getIsotipoLogo(useDark.value);
});
</script>

<template>
  <span
    v-if="usesInlineSvg && inlineSvg"
    class="siec-brand-logo block max-w-full object-contain object-left"
    :class="variant === 'isotipo' ? 'aspect-square' : 'aspect-[1375/451]'"
    role="img"
    :aria-label="alt"
    v-html="inlineSvg"
  />
  <img
    v-else-if="!usesInlineSvg"
    :src="isotipoSrc"
    :alt="alt"
    class="block max-w-full object-contain object-left aspect-square"
    decoding="async"
  />
</template>

<style scoped>
.siec-brand-logo :deep(svg) {
  display: block;
  height: 100%;
  width: auto;
  max-width: 100%;
}
</style>
