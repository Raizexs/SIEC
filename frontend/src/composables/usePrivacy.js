import { ref } from 'vue';
import { useApi } from './useApi';

const policyCache = ref(null);
const consentStatusCache = ref(null);

export function usePrivacy() {
  const api = useApi();

  const fetchPolicy = async () => {
    if (policyCache.value) return policyCache.value;
    policyCache.value = await api.get('/privacy/policy');
    return policyCache.value;
  };

  const fetchConsentStatus = async (force = false) => {
    if (consentStatusCache.value && !force) return consentStatusCache.value;
    consentStatusCache.value = await api.get('/privacy/consents/status');
    return consentStatusCache.value;
  };

  const hasConsent = async (consentType) => {
    const status = await fetchConsentStatus();
    const row = status.find((s) => s.consent_type === consentType);
    return Boolean(row?.has_active_consent);
  };

  const grantConsent = async (consentType, policyVersion, metadata = {}) => {
    const res = await api.post('/privacy/consent', {
      consent_type: consentType,
      policy_version: policyVersion,
      granted: true,
      metadata,
    });
    consentStatusCache.value = null;
    return res;
  };

  const grantRegistrationConsents = async (policyVersion) => {
    await grantConsent('privacy_policy', policyVersion);
    await grantConsent('terms', policyVersion);
  };

  const revokeConsent = async (consentType) => {
    const res = await api.post('/privacy/consent/revoke', {
      consent_type: consentType,
    });
    consentStatusCache.value = null;
    return res;
  };

  const exportMyData = async () => {
    return api.get('/me/export');
  };

  const requestAccountDeletion = async () => {
    return api.post('/me/delete-request', { confirmation: 'ELIMINAR' });
  };

  const confirmAccountDeletion = async (token) => {
    return api.delete('/me', { query: { token } });
  };

  const clearCache = () => {
    policyCache.value = null;
    consentStatusCache.value = null;
  };

  return {
    fetchPolicy,
    fetchConsentStatus,
    hasConsent,
    grantConsent,
    grantRegistrationConsents,
    revokeConsent,
    exportMyData,
    requestAccountDeletion,
    confirmAccountDeletion,
    clearCache,
  };
}
