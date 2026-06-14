import logger from '../utils/logger.js';
/**
 * Offline cache for projects using IndexedDB (Dexie).
 *
 * Used by `useProjectsApi` so the workspace keeps working when the user is
 * offline or when the backend is briefly unavailable. Local changes are queued
 * with a `pending` flag and replayed on reconnect.
 */
import Dexie from "dexie";

export const projectsDb = new Dexie("siec-projects");
projectsDb.version(1).stores({
  // primary key first; secondary indexes after the &(name)
  projects: "id, owner_id, updated_at, archived",
  versions: "id, proyecto_id, version_number, created_at",
  outbox: "++id, kind, payload, ts",
});

export async function cacheProjects(list) {
  await projectsDb.projects.clear();
  await projectsDb.projects.bulkPut(list);
}

export async function listCachedProjects() {
  return projectsDb.projects.orderBy("updated_at").reverse().toArray();
}

export async function cacheProject(p) {
  await projectsDb.projects.put(p);
}

export async function enqueue(kind, payload) {
  await projectsDb.outbox.add({ kind, payload, ts: Date.now() });
}

export async function flushOutbox(api) {
  const items = await projectsDb.outbox.orderBy("ts").toArray();
  for (const item of items) {
    try {
      if (item.kind === "create") {
        const created = await api.post("/projects", item.payload);
        await projectsDb.projects.put(created);
      } else if (item.kind === "update") {
        const { id, patch } = item.payload;
        const updated = await api.patch(`/projects/${id}`, patch);
        await projectsDb.projects.put(updated);
      } else if (item.kind === "delete") {
        await api.delete(`/projects/${item.payload.id}`);
        await projectsDb.projects.delete(item.payload.id);
      }
      await projectsDb.outbox.delete(item.id);
    } catch (e) {
      logger.warn("[outbox] flush failed, will retry", item.kind, e);
      break;
    }
  }
}
