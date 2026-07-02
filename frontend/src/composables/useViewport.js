import { ref, onMounted, onBeforeUnmount } from 'vue';

const MOBILE_QUERY = '(max-width: 1023px)';
const NARROW_EDITOR_QUERY = '(max-width: 1279px)';

function createMediaRef(query) {
  const matches = ref(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  let mediaQuery;

  const update = () => {
    matches.value = mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(query);
    update();
    mediaQuery.addEventListener('change', update);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', update);
  });

  return matches;
}

/** Viewport below Tailwind `lg` (1024px). */
export function useIsMobile() {
  return createMediaRef(MOBILE_QUERY);
}

/** Viewport below Tailwind `xl` (1280px) — stacked editor layout. */
export function useIsNarrowEditor() {
  return createMediaRef(NARROW_EDITOR_QUERY);
}

export function useViewport() {
  const isMobile = useIsMobile();
  const isNarrowEditor = useIsNarrowEditor();

  return { isMobile, isNarrowEditor };
}
