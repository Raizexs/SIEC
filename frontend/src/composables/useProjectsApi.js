import logger from '../utils/logger.js';
/**
 * useProjectsApi — high-level project CRUD with Dexie offline cache.
 *
 * - `list({ archived, search })` — backend first, fallback to cache.
 * - `get(id)` — fetch + cache.
 * - `create(data)` — POST + cache; if offline, queues in outbox.
 * - `update(id, patch)` — PATCH + cache; if offline, queues.
 * - `delete(id)` — DELETE + cache.
 * - `autoSave(id, patch, debounceMs)` — debounced PATCH for live editing.
 *
 * Versions: `listVersions`, `createVersion`, `restoreVersion`.
 * Comments: `listComments`, `createComment`, `resolveComment`.
 * Collaboration: `listCollaborators`, `addCollaborator`, `removeCollaborator`,
 *                 `createShareLink`, `revokeShareLink`.
 */
import { ref } from "vue";
import { useApi, HttpError } from "./useApi";
import { useBilling } from "./useBilling";
import {
  cacheProjects,
  cacheProject,
  listCachedProjects,
  enqueue,
  flushOutbox,
  projectsDb,
} from "../lib/OfflineCache";

const isOnline = ref(
  typeof navigator !== "undefined" ? navigator.onLine : true,
);
if (typeof window !== "undefined") {
  window.addEventListener("online", () => (isOnline.value = true));
  window.addEventListener("offline", () => (isOnline.value = false));
}

export function useProjectsApi() {
  const api = useApi();
  const { handlePlanLimitError } = useBilling();
  const list = async ({ archived = false, search = "" } = {}) => {
    try {
      const data = await api.get("/projects", { query: { archived, search } });
      await cacheProjects(data);
      await flushOutbox(api).catch(() => {});
      return data;
    } catch (err) {
      logger.warn("[projects] list fallback to cache:", err.message);
      return listCachedProjects();
    }
  };

  const get = async (id) => {
    try {
      const data = await api.get(`/projects/${id}`);
      await cacheProject(data);
      return data;
    } catch (err) {
      const cached = await projectsDb.projects.get(id);
      if (cached) return cached;
      throw err;
    }
  };

  const create = async (data) => {
    if (!isOnline.value) {
      await enqueue("create", data);
      const tempId = `local-${Date.now()}`;
      const local = {
        ...data,
        id: tempId,
        owner_id: "local",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false,
        is_public: false,
      };
      await cacheProject(local);
      return local;
    }
    try {
      const created = await api.post("/projects", data);
      await cacheProject(created);
      return created;
    } catch (err) {
      if (handlePlanLimitError(err)) throw err;
      throw err;
    }
  };

  const update = async (id, patch) => {
    if (!isOnline.value) {
      await enqueue("update", { id, patch });
      const cached = await projectsDb.projects.get(id);
      if (cached) {
        const merged = {
          ...cached,
          ...patch,
          updated_at: new Date().toISOString(),
        };
        await cacheProject(merged);
        return merged;
      }
      throw new Error(
        "No se puede actualizar un proyecto inexistente offline.",
      );
    }
    const updated = await api.patch(`/projects/${id}`, patch);
    await cacheProject(updated);
    return updated;
  };

  const remove = async (id) => {
    if (!isOnline.value) {
      await enqueue("delete", { id });
      await projectsDb.projects.delete(id);
      return;
    }
    await api.delete(`/projects/${id}`);
    await projectsDb.projects.delete(id);
  };

  /* ── Auto-save with debounce ────────────────────────────────────────── */
  const _saveTimers = new Map();
  const autoSave = (id, patch, debounceMs = 1500) => {
    const existing = _saveTimers.get(id);
    if (existing) clearTimeout(existing);
    return new Promise((resolve, reject) => {
      const t = setTimeout(async () => {
        _saveTimers.delete(id);
        try {
          const result = await update(id, patch);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }, debounceMs);
      _saveTimers.set(id, t);
    });
  };

  /* ── Versions ──────────────────────────────────────────────────────── */
  const listVersions = (id) => api.get(`/projects/${id}/versions`);
  const createVersion = (id, body) =>
    api.post(`/projects/${id}/versions`, body);
  const restoreVersion = (id, versionId) =>
    api.post(`/projects/${id}/versions/${versionId}/restore`);

  /* ── Comments ──────────────────────────────────────────────────────── */
  const listComments = (id) => api.get(`/projects/${id}/comments`);
  const createComment = (id, body) =>
    api.post(`/projects/${id}/comments`, body);
  const resolveComment = (id, commentId) =>
    api.patch(`/projects/${id}/comments/${commentId}/resolve`);

  /* ── Collaboration ─────────────────────────────────────────────────── */
  const listCollaborators = (id) => api.get(`/projects/${id}/collaborators`);
  const addCollaborator = (id, body) =>
    api.post(`/projects/${id}/collaborators`, body);
  const removeCollaborator = (id, userId) =>
    api.delete(`/projects/${id}/collaborators/${userId}`);
  const createShareLink = (id, body) => api.post(`/projects/${id}/share`, body);
  const revokeShareLink = (id) => api.delete(`/projects/${id}/share`);

  return {
    isOnline,
    list,
    get,
    create,
    update,
    remove,
    autoSave,
    listVersions,
    createVersion,
    restoreVersion,
    listComments,
    createComment,
    resolveComment,
    listCollaborators,
    addCollaborator,
    removeCollaborator,
    createShareLink,
    revokeShareLink,
  };
}
