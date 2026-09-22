import { useEffect, useState } from 'react';
import { DropdownOption } from '../components/molecules/DropdownField';
import { apiClient } from '../services/apiClient';
import { Routes } from '../services/routes';

type RawRecord = Record<string, unknown>;

export type TicketCategoryOption = DropdownOption & {
  subcategories: DropdownOption[];
};

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const recordId = (record: RawRecord) => text(record._id || record.id || record.value);
const recordLabel = (record: RawRecord) => text(record.name || record.title || record.label);

const listFrom = (payload: unknown, keys: string[]): RawRecord[] => {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === 'object') as RawRecord[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as RawRecord;
  for (const key of keys) {
    if (Array.isArray(record[key])) return listFrom(record[key], keys);
    if (record[key] && typeof record[key] === 'object') {
      const nested = listFrom(record[key], keys);
      if (nested.length) return nested;
    }
  }
  return [];
};

const toOption = (record: RawRecord): DropdownOption | null => {
  const value = recordId(record);
  const label = recordLabel(record);
  return value && label ? { value, label } : null;
};

const optionListFrom = (value: unknown): DropdownOption[] => {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (typeof item === 'string') {
      const value = item.trim();
      return value ? { value, label: value } : null;
    }
    return item && typeof item === 'object' ? toOption(item as RawRecord) : null;
  }).filter((item): item is DropdownOption => Boolean(item));
};

export function useTicketFormOptions() {
  const [categories, setCategories] = useState<TicketCategoryOption[]>([]);
  const [staff, setStaff] = useState<DropdownOption[]>([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get<unknown>(Routes.ticketCategories),
      apiClient.get<unknown>(Routes.staff),
    ]).then(([categoryResult, staffResult]) => {
      if (!active) return;
      if (categoryResult.status === 'fulfilled') {
        const records = listFrom(categoryResult.value, ['categories', 'ticketCategories', 'data', 'items']);
        setCategories(records.map(record => {
          const option = toOption(record);
          if (!option) return null;
          const rawChildren = record.subcategories || record.subCategories || record.children;
          const children = optionListFrom(rawChildren).length
            ? optionListFrom(rawChildren)
            : listFrom(rawChildren, ['subcategories', 'data', 'items'])
              .map(toOption).filter((item): item is DropdownOption => Boolean(item));
          return { ...option, subcategories: children };
        }).filter((item): item is TicketCategoryOption => Boolean(item)));
      }
      if (staffResult.status === 'fulfilled') {
        setStaff(listFrom(staffResult.value, ['staff', 'users', 'data', 'items'])
          .map(toOption).filter((item): item is DropdownOption => Boolean(item)));
      }
    });
    return () => { active = false; };
  }, []);

  return { categories, staff };
}
