import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPaintSpec } from "./garage";
import { formatShortDate } from "./storage";
import type { CarConfig, GameSummary, ScoreEntry } from "./types";

const FALLBACK_SUPABASE_URL = "https://tvghednicsndozicnuvh.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z2hlZG5pY3NuZG96aWNudXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTk1MjEsImV4cCI6MjExMDE3NTUyMX0.VmrC3Au7vsAy655vRe6ZcR1opywCl2WDy0Ml7kkmCi4";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY?.trim() || FALLBACK_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

interface LeaderboardRow {
  id: string;
  pilot_name: string;
  score: number;
  distance_km: number | string;
  top_speed_kmh: number;
  overtakes: number;
  near_misses: number;
  items_collected: number;
  car_chassis: string;
  car_color: string;
  car_number: string;
  is_legend: boolean;
  legend_year: string | null;
  created_at: string;
}

function mapRow(row: LeaderboardRow): ScoreEntry {
  const dist = typeof row.distance_km === "string" ? parseFloat(row.distance_km) : row.distance_km;
  return {
    id: row.id,
    name: (row.pilot_name || "PILOTA").slice(0, 14).toUpperCase(),
    score: Math.round(Number(row.score) || 0),
    distanceKm: Number.isFinite(dist) ? Number(dist.toFixed(2)) : 0,
    topSpeedKmh: Math.round(Number(row.top_speed_kmh) || 0),
    overtakes: Math.round(Number(row.overtakes) || 0),
    nearMisses: Math.round(Number(row.near_misses) || 0),
    itemsCollected: Math.round(Number(row.items_collected) || 0),
    carChassis: row.car_chassis || "berlinetta",
    carColor: row.car_color || "#df3b2c",
    carNumber: row.car_number || "27",
    date: row.is_legend && row.legend_year ? row.legend_year : formatShortDate(new Date(row.created_at)),
    legend: Boolean(row.is_legend),
    online: true,
  };
}

export async function fetchGlobalLeaderboard(limit = 25): Promise<{
  entries: ScoreEntry[];
  online: boolean;
  error?: string;
}> {
  const sb = getSupabaseClient();
  if (!sb) return { entries: [], online: false, error: "Supabase non configurato" };

  try {
    const { data, error } = await sb
      .from("leaderboard")
      .select(
        "id, pilot_name, score, distance_km, top_speed_kmh, overtakes, near_misses, items_collected, car_chassis, car_color, car_number, is_legend, legend_year, created_at"
      )
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return { entries: [], online: false, error: error.message };
    }
    const entries = ((data ?? []) as LeaderboardRow[]).map(mapRow);
    return { entries, online: true };
  } catch (err) {
    return {
      entries: [],
      online: false,
      error: err instanceof Error ? err.message : "Errore di rete",
    };
  }
}

export async function submitGlobalScore(params: {
  pilotName: string;
  summary: GameSummary;
  car: CarConfig;
}): Promise<{
  entry: ScoreEntry | null;
  entries: ScoreEntry[];
  rank: number;
  online: boolean;
  error?: string;
}> {
  const sb = getSupabaseClient();
  if (!sb) return { entry: null, entries: [], rank: 0, online: false, error: "Offline" };

  const cleanName = params.pilotName.trim().slice(0, 12).toUpperCase() || "PILOTA";
  const paint = getPaintSpec(params.car.paint);

  try {
    const insertPayload = {
      pilot_name: cleanName,
      score: Math.max(0, Math.min(10000000, Math.round(params.summary.score))),
      distance_km: Number(Math.max(0, params.summary.distanceKm).toFixed(2)),
      top_speed_kmh: Math.max(0, Math.min(600, Math.round(params.summary.topSpeedKmh))),
      overtakes: Math.max(0, Math.round(params.summary.overtakes)),
      near_misses: Math.max(0, Math.round(params.summary.nearMisses)),
      items_collected: Math.max(0, Math.round(params.summary.coins + params.summary.itemsUsed)),
      car_chassis: params.car.chassis,
      car_color: paint.mid,
      car_number: params.car.number || "27",
      is_legend: false,
    };

    const { data: inserted, error: insertError } = await sb
      .from("leaderboard")
      .insert(insertPayload)
      .select(
        "id, pilot_name, score, distance_km, top_speed_kmh, overtakes, near_misses, items_collected, car_chassis, car_color, car_number, is_legend, legend_year, created_at"
      )
      .single();

    if (insertError) {
      return { entry: null, entries: [], rank: 0, online: false, error: insertError.message };
    }

    const entry = inserted ? mapRow(inserted as LeaderboardRow) : null;
    const latest = await fetchGlobalLeaderboard(25);
    const rank = entry ? latest.entries.findIndex((e) => e.id === entry.id) + 1 : 0;

    return {
      entry,
      entries: latest.entries,
      rank,
      online: latest.online,
    };
  } catch (err) {
    return {
      entry: null,
      entries: [],
      rank: 0,
      online: false,
      error: err instanceof Error ? err.message : "Errore invio punteggio",
    };
  }
}
