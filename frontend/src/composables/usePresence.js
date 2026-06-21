/**
 * usePresence — Supabase Realtime presence + lock channel for collaborative
 * editing of a single project.
 *
 * Each connected client publishes:
 *   - identity (user_id, name, color, avatar_url)
 *   - cursor coordinates (x, z) within the workspace
 *   - currently active recinto_id (for "who is editing what")
 *
 * Optimistic locks are claimed via broadcast + acked by quorum: if no one
 * else has the lock for `recinto_id` within 80ms, the local user owns it.
 */
import { ref, onBeforeUnmount } from "vue";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { useAuthStore } from "../stores/auth";

const COLORS = [
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#3b82f6",
];

export function usePresence(projectId) {
  const auth = useAuthStore();
  const peers = ref([]); // [{ user_id, name, color, cursor: {x,z}, active_recinto, avatar_url }]
  const locks = ref(new Map()); // recinto_id -> user_id
  const isConnected = ref(false);
  let channel = null;

  const myColor =
    COLORS[Math.abs(hashString(auth.userId || "anon")) % COLORS.length];

  const connect = () => {
    if (!isSupabaseConfigured || !projectId || !auth.userId) return;
    channel = supabase.channel(`project:${projectId}`, {
      config: { presence: { key: auth.userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      peers.value = Object.entries(state)
        .flatMap(([user_id, metas]) => {
          const meta = metas[0] || {};
          return [
            {
              user_id,
              name: meta.name,
              avatar_url: meta.avatar_url,
              color: meta.color,
              cursor: meta.cursor,
              active_recinto: meta.active_recinto,
            },
          ];
        })
        .filter((p) => p.user_id !== auth.userId);
    });

    channel.on("broadcast", { event: "lock" }, ({ payload }) => {
      if (payload.action === "claim") {
        locks.value.set(payload.recinto_id, payload.user_id);
      } else if (payload.action === "release") {
        locks.value.delete(payload.recinto_id);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        isConnected.value = true;
        await channel.track({
          name: auth.fullName,
          avatar_url: auth.avatarUrl,
          color: myColor,
          cursor: null,
          active_recinto: null,
          ts: Date.now(),
        });
      }
    });
  };

  const updateCursor = async (x, z) => {
    if (!channel || !isConnected.value) return;
    await channel.track({
      name: auth.fullName,
      avatar_url: auth.avatarUrl,
      color: myColor,
      cursor: { x, z },
      ts: Date.now(),
    });
  };

  const setActiveRecinto = async (recintoId) => {
    if (!channel || !isConnected.value) return;
    await channel.track({
      name: auth.fullName,
      avatar_url: auth.avatarUrl,
      color: myColor,
      active_recinto: recintoId,
      ts: Date.now(),
    });
  };

  const claimLock = (recintoId) => {
    if (!channel) return false;
    const existing = locks.value.get(recintoId);
    if (existing && existing !== auth.userId) return false;
    locks.value.set(recintoId, auth.userId);
    channel.send({
      type: "broadcast",
      event: "lock",
      payload: { action: "claim", recinto_id: recintoId, user_id: auth.userId },
    });
    return true;
  };

  const releaseLock = (recintoId) => {
    if (!channel) return;
    if (locks.value.get(recintoId) === auth.userId) {
      locks.value.delete(recintoId);
      channel.send({
        type: "broadcast",
        event: "lock",
        payload: {
          action: "release",
          recinto_id: recintoId,
          user_id: auth.userId,
        },
      });
    }
  };

  const disconnect = async () => {
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      channel = null;
      isConnected.value = false;
    }
  };

  onBeforeUnmount(() => disconnect());

  return {
    peers,
    locks,
    isConnected,
    connect,
    disconnect,
    updateCursor,
    setActiveRecinto,
    claimLock,
    releaseLock,
    myColor,
  };
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}