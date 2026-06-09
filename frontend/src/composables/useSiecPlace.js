import { ref } from 'vue';
import { useApi, HttpError } from './useApi';
import { toast } from 'vue-sonner';

export function useSiecPlace() {
  const api = useApi();
  const listings = ref([]);
  const myListings = ref([]);
  const selectedListing = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchListings = async () => {
    loading.value = true;
    error.value = null;
    try {
      listings.value = (await api.get('/siecplace/listings')) || [];
      return listings.value;
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) return [];
      error.value = err.message || 'No se pudieron cargar las obras';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchMyListings = async () => {
    loading.value = true;
    error.value = null;
    try {
      myListings.value = (await api.get('/siecplace/listings/mine')) || [];
      return myListings.value;
    } catch (err) {
      if (err instanceof HttpError && err.status === 403) {
        myListings.value = [];
        return [];
      }
      error.value = err.message || 'No se pudieron cargar tus publicaciones';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchListing = async (listingId) => {
    loading.value = true;
    error.value = null;
    try {
      selectedListing.value = await api.get(`/siecplace/listings/${listingId}`);
      return selectedListing.value;
    } catch (err) {
      error.value = err.message || 'Obra no encontrada';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createListing = async (payload) => {
    const listing = await api.post('/siecplace/listings', payload);
    myListings.value = [listing, ...myListings.value];
    return listing;
  };

  const checkoutPublish = async (listingId) => {
    try {
      const res = await api.post(`/siecplace/listings/${listingId}/checkout-publish`, {});
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return res;
      }
      toast.error('No se pudo iniciar el pago de publicación.');
      return res;
    } catch (err) {
      const detail = err.payload?.detail;
      const msg =
        typeof detail === 'object' ? detail.message : detail || 'Pagos no disponibles';
      toast.error(msg);
      throw err;
    }
  };

  const checkoutUnlock = async (listingId) => {
    try {
      const res = await api.post(`/siecplace/listings/${listingId}/checkout-unlock`, {});
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return res;
      }
      toast.error('No se pudo iniciar el pago de contacto.');
      return res;
    } catch (err) {
      const detail = err.payload?.detail;
      const msg =
        typeof detail === 'object' ? detail.message : detail || 'Pagos no disponibles';
      toast.error(msg);
      throw err;
    }
  };

  return {
    listings,
    myListings,
    selectedListing,
    loading,
    error,
    fetchListings,
    fetchMyListings,
    fetchListing,
    createListing,
    checkoutPublish,
    checkoutUnlock,
  };
}
