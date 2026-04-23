import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isLoading = ref(true); // Inicialmente carga sesión guardada
  const error = ref(null);
  const exportHistory = ref([]);

  const isAuthenticated = computed(() => !!user.value);

  // Inicializar estado desde LocalStorage (Mock)
  const initializeAuth = () => {
    try {
      const session = localStorage.getItem('siec_session');
      if (session) {
        user.value = JSON.parse(session);
      }
      const history = localStorage.getItem('siec_export_history');
      if (history) {
        exportHistory.value = JSON.parse(history);
      }
    } catch (e) {
      console.warn("No se pudo cargar sesión simulada", e);
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (email, password) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      // TODO: Sustituir este bloque con integración real de Supabase
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      // if (error) throw error;
      
      // Simulación de latencia de red para efecto visual
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (email && password) { // Acepta cualquier usuario/pass temporalmente
        user.value = {
          id: 'dev-user-123',
          email,
          name: email.split('@')[0],
          role: 'architect'
        };
        localStorage.setItem('siec_session', JSON.stringify(user.value));
        return true;
      } else {
        throw new Error("Credenciales inválidas");
      }
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;
    try {
      // TODO: supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 500));
      user.value = null;
      exportHistory.value = [];
      localStorage.removeItem('siec_session');
      localStorage.removeItem('siec_export_history');
    } finally {
      isLoading.value = false;
    }
  };

  const addExportToHistory = (projectName) => {
    exportHistory.value.unshift({
      id: Date.now(),
      name: projectName || 'Proyecto Sin Título',
      date: new Date().toLocaleDateString()
    });
    // Limitar historial a los 10 últimos
    if (exportHistory.value.length > 10) exportHistory.value.pop();
    localStorage.setItem('siec_export_history', JSON.stringify(exportHistory.value));
  };

  return {
    user,
    isLoading,
    error,
    exportHistory,
    isAuthenticated,
    initializeAuth,
    login,
    logout,
    addExportToHistory
  };
});
