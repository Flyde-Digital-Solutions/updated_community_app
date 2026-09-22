import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/apiClient';
import { Routes } from '../services/routes';
import { DropdownOption } from '../components/molecules/DropdownField';

type RawRecord = Record<string, unknown>;

export type EventCategoryOption = DropdownOption & {
  subcategories: DropdownOption[];
};

export const resolveDropdownSelection = (
  options: DropdownOption[],
  savedValue?: string,
  savedLabel?: string,
) => {
  if (savedValue && options.some(option => option.value === savedValue)) {
    return savedValue;
  }
  const normalizedLabel = savedLabel?.trim().toLocaleLowerCase();
  if (!normalizedLabel) return savedValue || '';
  return (
    options.find(
      option => option.label.trim().toLocaleLowerCase() === normalizedLabel,
    )?.value ||
    savedValue ||
    ''
  );
};

const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';
const id = (record: RawRecord) => text(record._id || record.id || record.value);
const label = (record: RawRecord) =>
  text(record.name || record.title || record.label);

const listFrom = (payload: unknown, keys: string[]): RawRecord[] => {
  if (Array.isArray(payload))
    return payload.filter(
      item => item && typeof item === 'object',
    ) as RawRecord[];
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
  const value = id(record);
  const optionLabel = label(record);
  return value && optionLabel ? { value, label: optionLabel } : null;
};

const optionListFrom = (value: unknown): DropdownOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === 'string') {
        const value = item.trim();
        return value ? { value, label: value } : null;
      }
      return item && typeof item === 'object'
        ? toOption(item as RawRecord)
        : null;
    })
    .filter((item): item is DropdownOption => Boolean(item));
};

export const dateOptions = (days = 120): DropdownOption[] => {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return {
      value: date.toISOString().slice(0, 10),
      label: formatter.format(date),
    };
  });
};

export const timeOptions = (): DropdownOption[] =>
  Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 ? '30' : '00';
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const value = `${String(hour).padStart(2, '0')}:${minute}`;
    return { value, label: `${displayHour}:${minute} ${suffix}` };
  });

export function useEventFormOptions() {
  const { members } = useApp();
  const [categories, setCategories] = useState<EventCategoryOption[]>([]);
  const [staff, setStaff] = useState<DropdownOption[]>([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get<unknown>(Routes.community.eventCategories),
      apiClient.get<unknown>(Routes.staff),
    ]).then(([categoryResult, staffResult]) => {
      if (!active) return;
      if (categoryResult.status === 'fulfilled') {
        const records = listFrom(categoryResult.value, [
          'categories',
          'eventCategories',
          'data',
          'items',
        ]);
        setCategories(
          records
            .map(record => {
              const option = toOption(record);
              if (!option) return null;
              const rawChildren =
                record.subcategories || record.subCategories || record.children;
              const directChildren = optionListFrom(rawChildren);
              const subcategories = directChildren.length
                ? directChildren
                : listFrom(rawChildren, ['subcategories', 'data', 'items'])
                    .map(toOption)
                    .filter((item): item is DropdownOption => Boolean(item));
              return { ...option, subcategories };
            })
            .filter((item): item is EventCategoryOption => Boolean(item)),
        );
      }
      if (staffResult.status === 'fulfilled') {
        const records = listFrom(staffResult.value, [
          'staff',
          'users',
          'data',
          'items',
        ]);
        setStaff(
          records
            .map(toOption)
            .filter((item): item is DropdownOption => Boolean(item)),
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const speakers = useMemo(() => {
    if (staff.length) return staff;
    return members
      .filter(member => member.id && member.name)
      .map(member => ({ value: member.id, label: member.name }));
  }, [members, staff]);

  return { categories, speakers };
}
