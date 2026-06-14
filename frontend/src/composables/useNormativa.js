import { ref } from 'vue';
import { useApi } from './useApi';

const lastResult = ref(null);
const loading = ref(false);

export function useNormativa() {
  const api = useApi();

  const validarNormativa = async (payload) => {
    loading.value = true;
    try {
      const data = await api.post('/api/validar-normativa', payload);
      lastResult.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  return {
    lastResult,
    loading,
    validarNormativa,
  };
}
