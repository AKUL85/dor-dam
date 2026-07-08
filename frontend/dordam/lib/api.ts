// ─────────────────────────────────────────────────────────────
//  Typed API client for the DorDam GSMArena-style catalog backend.
//  All calls are server-side by default (used in Server Components);
//  quickSearch is also used from a Client Component.
// ─────────────────────────────────────────────────────────────

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export interface KeySpecs {
  ram?: string | null;
  storage?: string | null;
  chipset?: string | null;
  battery?: string | null;
  display?: string | null;
  camera?: string | null;
  os?: string | null;
  network?: string | null;
}

export interface PhoneCard {
  slug: string;
  brand: string;
  name: string;
  image: string | null;
  releaseYear: number | null;
  releaseDate: string | null;
  status: string | null;
  popularity: number | null;
  priceHint: string | null;
  keySpecs: KeySpecs;
}

export interface PhoneDetail extends Omit<PhoneCard, "name" | "image"> {
  modelName: string;
  imageUrl: string | null;
  thumb: string | null;
  deviceId: number | null;
  detailUrl: string | null;
  deviceType: string;
  quickSpecs: Record<string, string | null>;
  specs: Record<string, Record<string, string>>;
}

export interface Brand {
  name: string;
  slug: string;
  phoneCount: number;
}

export interface CatalogMeta {
  source: string;
  generatedAt: string | null;
  totalBrands: number;
  totalPhones: number;
}

export interface PhoneListResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: string;
  items: PhoneCard[];
}

type Query = Record<string, string | number | undefined | null>;

function buildQuery(params: Query = {}): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    // Catalog is refreshed by scraping; revalidate periodically.
    next: { revalidate: 300 },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchMeta(): Promise<CatalogMeta> {
  const data = await getJson<{ meta: CatalogMeta }>("/catalog/meta");
  return data.meta;
}

export async function fetchBrands(): Promise<Brand[]> {
  const data = await getJson<{ brands: Brand[] }>("/brands");
  return data.brands;
}

export async function fetchPhones(params: Query = {}): Promise<PhoneListResult> {
  return getJson<PhoneListResult>(`/phones${buildQuery(params)}`);
}

export async function fetchPhone(slug: string): Promise<PhoneDetail | null> {
  try {
    const data = await getJson<{ phone: PhoneDetail }>(`/phones/${encodeURIComponent(slug)}`);
    return data.phone;
  } catch {
    return null;
  }
}

export async function fetchCompare(slugs: string[]): Promise<PhoneDetail[]> {
  if (slugs.length === 0) return [];
  const data = await getJson<{ phones: PhoneDetail[] }>(
    `/compare${buildQuery({ slugs: slugs.join(",") })}`
  );
  return data.phones;
}

export async function quickSearch(q: string, limit = 8): Promise<PhoneCard[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${API_BASE}/search${buildQuery({ q, limit })}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results: PhoneCard[] };
  return data.results;
}
