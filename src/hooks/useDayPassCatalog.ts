import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { Routes } from '../services/routes';
import { useApp } from '../context/AppContext';

type RawRecord = Record<string, unknown>;

export type BuildingCatalogItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  price: number;
  dailyCapacity: number;
  communityDiscountMaxPercent: number;
  coverImage?: string;
};

export type DayPassBundle = {
  id: string;
  discountBundleId: string;
  name: string;
  description: string;
  passCount: number;
  discountPercent: number;
  buildingId?: string;
};

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const record = (value: unknown): RawRecord | null => value && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : null;

const listFrom = (payload: unknown, keys: string[]): RawRecord[] => {
  if (Array.isArray(payload)) return payload.filter(item => record(item)) as RawRecord[];
  const source = record(payload);
  if (!source) return [];
  for (const key of keys) {
    if (Array.isArray(source[key])) return listFrom(source[key], keys);
    if (record(source[key])) {
      const nested = listFrom(source[key], keys);
      if (nested.length) return nested;
    }
  }
  return [];
};

const normalizeBuilding = (raw: RawRecord): BuildingCatalogItem | null => {
  const id = text(raw._id || raw.id);
  const name = text(raw.name);
  if (!id || !name || text(raw.status).toLowerCase() !== 'active') return null;
  const cityRecord = record(raw.city);
  return {
    id,
    name,
    address: text(raw.address),
    city: text(cityRecord?.name || raw.city),
    price: Number(raw.openSpacePricing || raw.dayPassPrice || 0),
    dailyCapacity: Number(raw.dayPassDailyCapacity || 0),
    communityDiscountMaxPercent: Number.isFinite(Number(raw.communityDiscountMaxPercent))
      ? Number(raw.communityDiscountMaxPercent)
      : 10,
    coverImage: text(raw.coverImage || raw.image) || undefined,
  };
};

const normalizeBundles = (payload: unknown): DayPassBundle[] => listFrom(payload, ['discountBundles', 'data', 'items'])
  .filter(raw => raw.isActive !== false)
  .flatMap(raw => {
    const building = record(raw.building);
    const buildingId = text(building?._id || raw.buildingId) || undefined;
    const parentName = text(raw.name);
    const discountBundleId = text(raw._id || raw.id);
    const description = text(raw.description);
    return listFrom(raw.bundles, ['bundles', 'data', 'items']).map(bundle => {
      const passCount = Number(bundle.no_of_day_passes || bundle.numberOfPasses || bundle.quantity || 0);
      const discountPercent = Number(bundle.discount_percentage || bundle.discountPercent || bundle.discount || 0);
      return {
        id: text(bundle._id || bundle.id) || `${text(raw._id)}-${passCount}`,
        discountBundleId,
        name: parentName || `${passCount} Day Passes`,
        description,
        passCount,
        discountPercent,
        buildingId,
      };
    });
  })
  .filter(bundle => bundle.id && bundle.passCount > 0);

export function useDayPassCatalog() {
  const { user } = useApp();
  const [buildings, setBuildings] = useState<BuildingCatalogItem[]>([]);
  const [bundles, setBundles] = useState<DayPassBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get<unknown>(Routes.community.buildings),
      apiClient.get<unknown>(Routes.discountBundles, { type: 'day_pass', active: true }),
    ]).then(([buildingResult, bundleResult]) => {
      if (!active) return;
      if (buildingResult.status === 'fulfilled') {
        setBuildings(listFrom(buildingResult.value, ['buildings', 'data', 'items'])
          .map(normalizeBuilding).filter((item): item is BuildingCatalogItem => Boolean(item)));
      } else {
        setError(buildingResult.reason instanceof Error ? buildingResult.reason.message : 'Unable to load locations.');
      }
      if (bundleResult.status === 'fulfilled') setBundles(normalizeBundles(bundleResult.value));
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.buildingId]);

  return { buildings, bundles, loading, error };
}
