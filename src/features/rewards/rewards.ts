/**
 * Belohnungen: Jeder vollständige Monat (ein Foto an jedem Tag) schaltet die
 * nächste Belohnung dieser Liste frei. Die Reihenfolge ist fest, damit jeder
 * weiss, was als Nächstes kommt.
 */
export type RewardKind = 'filter' | 'frame' | 'design';
export type Reward = { kind: RewardKind; id: string };

export const REWARDS: readonly Reward[] = [
  { kind: 'filter', id: 'fade' },
  { kind: 'frame', id: 'film' },
  { kind: 'design', id: 'polaroid' },
  { kind: 'filter', id: 'noir' },
  { kind: 'frame', id: 'gold' },
  { kind: 'design', id: 'round' },
];

export function rewardKey(reward: Reward): string {
  return `${reward.kind}:${reward.id}`;
}

/** Schlüssel aller freigeschalteten Belohnungen bei n vollständigen Monaten. */
export function unlockedRewards(completedMonthCount: number): Set<string> {
  return new Set(REWARDS.slice(0, Math.max(0, completedMonthCount)).map(rewardKey));
}

export function nextReward(completedMonthCount: number): Reward | null {
  return REWARDS[Math.max(0, completedMonthCount)] ?? null;
}

export type CalendarDesign = 'classic' | 'polaroid' | 'round';
export const CALENDAR_DESIGNS: readonly CalendarDesign[] = ['classic', 'polaroid', 'round'];

export function isCalendarDesign(value: unknown): value is CalendarDesign {
  return typeof value === 'string' && (CALENDAR_DESIGNS as readonly string[]).includes(value);
}

/** "classic" ist immer verfügbar, die anderen sind Belohnungen. */
export function isDesignUnlocked(design: CalendarDesign, unlocked: ReadonlySet<string>): boolean {
  return design === 'classic' || unlocked.has(`design:${design}`);
}
