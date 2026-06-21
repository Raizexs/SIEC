function parsePayload(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function readStoredPreview(projectId) {
  if (!projectId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`siec:preview:${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.hero ? parsed : null;
  } catch {
    return null;
  }
}

export function storeProjectPreview(projectId, preview) {
  if (!projectId || !preview?.hero || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`siec:preview:${projectId}`, JSON.stringify({ hero: preview.hero }));
  } catch {
    /* quota */
  }
}

const MAX_INLINE_THUMB_CHARS = 120_000;

/** Material del proyecto: columna API, layout local o payload guardado. */
export function resolveProjectMaterialId(project) {
  if (!project || typeof project !== 'object') return null;

  const fromRoot = project.material_id ?? project.materialEstructuralId;
  if (fromRoot != null && Number(fromRoot) > 0) {
    return Number(fromRoot);
  }

  const payload = parsePayload(project.payload);
  const fromPayload =
    payload?.materialEstructuralId ?? payload?.material_estructural_id ?? null;

  if (fromPayload != null && Number(fromPayload) > 0) {
    return Number(fromPayload);
  }

  return null;
}

/** Quita imágenes pesadas del listado — las portadas viven en localStorage. */
export function slimProjectForList(project) {
  if (!project || typeof project !== 'object') return project;

  const payload = parsePayload(project.payload);
  const savedAt = payload?.saved_at ?? null;
  const materialId = resolveProjectMaterialId(project);
  const thumb =
    typeof project.thumbnail_url === 'string' &&
    project.thumbnail_url.startsWith('data:image') &&
    project.thumbnail_url.length <= MAX_INLINE_THUMB_CHARS
      ? project.thumbnail_url
      : null;

  const slimPayload = {};
  if (savedAt) slimPayload.saved_at = savedAt;
  if (materialId != null) slimPayload.materialEstructuralId = materialId;

  return {
    ...project,
    material_id: materialId ?? project.material_id,
    materialEstructuralId: materialId ?? project.materialEstructuralId,
    thumbnail_url: thumb,
    payload: Object.keys(slimPayload).length ? slimPayload : {},
  };
}

export function slimProjectList(projects) {
  return Array.isArray(projects) ? projects.map(slimProjectForList) : [];
}

/** Para Dexie: conserva recintos, quita solo imágenes embebidas. */
export function slimProjectForCache(project) {
  if (!project || typeof project !== 'object') return project;

  const payload = parsePayload(project.payload);
  let leanPayload = {};

  if (payload && typeof payload === 'object') {
    const { preview_collage: _pc, ...rest } = payload;
    leanPayload = rest;
  }

  const thumb =
    typeof project.thumbnail_url === 'string' &&
    project.thumbnail_url.startsWith('data:image') &&
    project.thumbnail_url.length <= MAX_INLINE_THUMB_CHARS
      ? project.thumbnail_url
      : null;

  return {
    ...project,
    thumbnail_url: thumb,
    payload: leanPayload,
  };
}

function resolveProjectPayload(project) {
  const fromField = parsePayload(project?.payload);
  if (fromField) return fromField;

  if (project?.preview_collage?.hero) {
    return { preview_collage: project.preview_collage };
  }

  const stored = readStoredPreview(project?.id);
  if (stored) {
    return { preview_collage: stored };
  }

  return project && typeof project === 'object' ? project : null;
}

/** Portada guardada del proyecto (hero únicamente). */
export function getProjectPreviewHero(project) {
  const payload = resolveProjectPayload(project);
  const hero = payload?.preview_collage?.hero;

  if (hero && typeof hero === 'string' && hero.startsWith('data:image')) {
    return hero;
  }

  const thumb =
    project?.thumbnail_url ||
    project?.thumbnail ||
    payload?.thumbnail ||
    null;

  if (thumb && typeof thumb === 'string' && thumb.startsWith('data:image')) {
    return thumb;
  }

  return null;
}

export function hasProjectPreviewImage(project) {
  return Boolean(getProjectPreviewHero(project));
}
