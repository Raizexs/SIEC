<script setup>
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import {
  FolderSync,
  Landmark,
  PenLine,
  ExternalLink,
  Info,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();

const integrationCards = computed(() => {
  void currentLanguage.value;
  const soon = t('settingsComingSoon');

  return [
    {
      id: 'gdrive',
      name: 'Google Drive',
      icon: FolderSync,
      description: t('settingsIntGdriveDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntGdriveHint'),
    },
    {
      id: 'revit',
      name: 'Revit / IFC',
      icon: Landmark,
      description: t('settingsIntRevitDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntRevitHint'),
    },
    {
      id: 'autocad',
      name: 'AutoCAD',
      icon: PenLine,
      description: t('settingsIntAutocadDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntAutocadHint'),
    },
  ];
});

const integrationVariantClass = (variant) => {
  const map = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300',
    neutral:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
    muted:
      'border-slate-200 bg-slate-50/80 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
  };
  return map[variant] || map.muted;
};
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
      {{ t('settingsIntegrationsStatus') }}
    </p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="card in integrationCards"
        :key="card.id"
        class="flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      >
        <div class="flex flex-1 flex-col gap-3 p-5">
          <div class="flex items-start justify-between gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <component :is="card.icon" class="h-5 w-5" :stroke-width="2.2" />
            </div>
            <span
              class="inline-flex max-w-[11rem] items-center justify-end rounded-full border px-2.5 py-1 text-right text-[10px] font-black uppercase tracking-tight leading-tight"
              :class="integrationVariantClass(card.statusVariant)"
            >
              {{ card.status }}
            </span>
          </div>
          <div>
            <h3 class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
              {{ card.name }}
            </h3>
            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ card.description }}
            </p>
            <p class="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              <Info class="mt-0.5 h-3 w-3 shrink-0" :stroke-width="2" />
              <span>{{ card.hint }}</span>
            </p>
          </div>
          <div class="mt-auto pt-1">
            <button
              type="button"
              class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                card.ctaDisabled
                  ? 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-orange-900/50 dark:hover:bg-orange-950/20 dark:hover:text-orange-200'
              "
              :disabled="card.ctaDisabled"
            >
              <ExternalLink v-if="!card.ctaDisabled" class="h-3.5 w-3.5" :stroke-width="2.2" />
              {{ card.cta }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
