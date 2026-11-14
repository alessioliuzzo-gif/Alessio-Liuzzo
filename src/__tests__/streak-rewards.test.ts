import { toDateKey } from '@/features/calendar/month-grid';
import {
  completedMonths,
  computeStreak,
  monthProgress,
  oneYearAgo,
  shiftDay,
} from '@/features/calendar/streak';
import { FILTERS } from '@/features/editor/filters';
import { FRAMES } from '@/features/editor/model';
import {
  CALENDAR_DESIGNS,
  isDesignUnlocked,
  nextReward,
  REWARDS,
  rewardKey,
  unlockedRewards,
} from '@/features/rewards/rewards';

const set = (...days: string[]) => new Set(days);
const fullMonth = (year: number, month: number) =>
  Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) =>
    toDateKey(new Date(year, month, i + 1)),
  );

describe('Serie', () => {
  it('ist ohne Fotos null', () => {
    expect(computeStreak(set(), '2026-11-14')).toEqual({ current: 0, longest: 0 });
  });

  it('zählt Tage in Folge bis heute, auch über Monats- und Jahreswechsel', () => {
    expect(computeStreak(set('2026-11-12', '2026-11-13', '2026-11-14'), '2026-11-14').current).toBe(
      3,
    );
    expect(computeStreak(set('2025-12-31', '2026-01-01'), '2026-01-01').current).toBe(2);
    expect(computeStreak(set('2028-02-28', '2028-02-29', '2028-03-01'), '2028-03-01').current).toBe(
      3,
    );
  });

  it('läuft weiter, solange nur das heutige Foto fehlt', () => {
    expect(computeStreak(set('2026-11-12', '2026-11-13'), '2026-11-14').current).toBe(2);
  });

  it('reisst, wenn ein ganzer Tag fehlt', () => {
    expect(computeStreak(set('2026-11-11', '2026-11-12'), '2026-11-14').current).toBe(0);
    expect(
      computeStreak(set('2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14'), '2026-11-14')
        .current,
    ).toBe(3);
  });

  it('merkt sich die längste Serie', () => {
    const days = set('2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-11-14');
    expect(computeStreak(days, '2026-11-14')).toEqual({ current: 1, longest: 4 });
  });

  it('rechnet Tage über die Zeitumstellung richtig weiter', () => {
    expect(shiftDay('2026-03-29', 1)).toBe('2026-03-30');
    expect(shiftDay('2026-10-25', -1)).toBe('2026-10-24');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('Monate', () => {
  it('zählt den Fortschritt im Monat', () => {
    expect(monthProgress(set('2026-11-01', '2026-11-30', '2026-12-01'), 2026, 10)).toEqual({
      done: 2,
      total: 30,
    });
    expect(monthProgress(set(), 2028, 1)).toEqual({ done: 0, total: 29 });
  });

  it('erkennt nur lückenlose Monate als vollständig', () => {
    const november = fullMonth(2026, 10);
    expect(completedMonths(new Set(november))).toEqual(['2026-11']);
    expect(completedMonths(new Set(november.slice(1)))).toEqual([]);
    expect(completedMonths(new Set([...fullMonth(2027, 1), ...november]))).toEqual([
      '2026-11',
      '2027-02',
    ]);
  });

  it('findet denselben Tag im Vorjahr', () => {
    expect(oneYearAgo('2026-11-14')).toBe('2025-11-14');
    expect(oneYearAgo('2028-02-29')).toBe('2027-02-28');
    expect(oneYearAgo('2029-02-28')).toBe('2028-02-28');
  });
});

describe('Belohnungen', () => {
  it('schaltet pro vollständigem Monat eine Belohnung frei', () => {
    expect(unlockedRewards(0).size).toBe(0);
    expect([...unlockedRewards(2)]).toEqual(['filter:fade', 'frame:film']);
    expect(unlockedRewards(99).size).toBe(REWARDS.length);
    expect(nextReward(0)).toEqual(REWARDS[0]);
    expect(nextReward(REWARDS.length)).toBeNull();
  });

  it('deckt genau die als Belohnung markierten Effekte ab', () => {
    const marked = [
      ...FILTERS.filter((f) => f.unlock === 'reward').map((f) => `filter:${f.id}`),
      ...FRAMES.filter((f) => f.unlock === 'reward').map((f) => `frame:${f.id}`),
      ...CALENDAR_DESIGNS.filter((d) => d !== 'classic').map((d) => `design:${d}`),
    ].sort();
    expect(REWARDS.map(rewardKey).sort()).toEqual(marked);
  });

  it('gibt das Standard-Kalenderdesign immer frei', () => {
    expect(isDesignUnlocked('classic', new Set())).toBe(true);
    expect(isDesignUnlocked('round', new Set())).toBe(false);
    expect(isDesignUnlocked('round', unlockedRewards(6))).toBe(true);
  });
});
