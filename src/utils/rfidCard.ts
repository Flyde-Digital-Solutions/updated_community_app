import type { RfidCard } from '../types/domain';

export function canManageIssuedRfidCard(card: Pick<RfidCard, 'status'>) {
  const status = String(card.status).trim().toLowerCase();
  return status === 'active' || status === 'issued';
}

export function isRfidCardAssigned(
  card: Pick<RfidCard, 'companyId' | 'company' | 'assignedTo'>,
) {
  return Boolean(
    card.companyId?.trim() || card.company?.trim() || card.assignedTo?.trim(),
  );
}

export function isRfidCardAvailableForAssignment(card: RfidCard) {
  return canManageIssuedRfidCard(card) && !isRfidCardAssigned(card);
}

export function canSubmitAccessCardIssue(
  cardId: string,
  selectedAreas: string[],
  availableAreaCount: number,
) {
  return Boolean(cardId.trim()) &&
    (availableAreaCount === 0 || selectedAreas.length > 0);
}

const cardKey = (card: Pick<RfidCard, 'id' | 'uid'>) =>
  String(card.id || card.uid).trim().toLowerCase();

/** Merge an import/refresh result without dropping cards already on screen. */
export function mergeImportedRfidCards(
  current: RfidCard[],
  refreshed: RfidCard[],
) {
  const merged = new Map<string, RfidCard>();
  current.forEach(card => merged.set(cardKey(card), card));
  refreshed.forEach(card => {
    const key = cardKey(card);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...card } : card);
  });
  const refreshedKeys = new Set(refreshed.map(cardKey));
  return [
    ...refreshed.map(card => merged.get(cardKey(card))!),
    ...current.filter(card => !refreshedKeys.has(cardKey(card))),
  ];
}
