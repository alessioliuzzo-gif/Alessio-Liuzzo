import { friendIds, groupConversations, relationTo, sanitizeSearch } from '@/features/social/logic';
import type { Friendship, Message } from '@/lib/database.types';

const f = (
  id: string,
  requester: string,
  addressee: string,
  status: Friendship['status'],
): Friendship => ({
  id,
  requester_id: requester,
  addressee_id: addressee,
  status,
  created_at: '2026-11-14T10:00:00Z',
});
const m = (id: string, sender: string, recipient: string, at: string, read = false): Message => ({
  id,
  sender_id: sender,
  recipient_id: recipient,
  body: id,
  photo_id: null,
  created_at: `2026-11-14T${at}:00Z`,
  read_at: read ? '2026-11-14T23:00:00Z' : null,
});

describe('Freundschaften', () => {
  const rows = [
    f('1', 'me', 'anna', 'accepted'),
    f('2', 'ben', 'me', 'accepted'),
    f('3', 'me', 'cleo', 'pending'),
    f('4', 'dan', 'me', 'pending'),
  ];

  it('erkennt die Beziehung aus beiden Richtungen', () => {
    expect(relationTo(rows, 'me', 'anna')).toEqual({ relation: 'friends', friendshipId: '1' });
    expect(relationTo(rows, 'me', 'ben').relation).toBe('friends');
    expect(relationTo(rows, 'me', 'cleo').relation).toBe('requested');
    expect(relationTo(rows, 'me', 'dan').relation).toBe('incoming');
    expect(relationTo(rows, 'me', 'eve')).toEqual({ relation: 'none', friendshipId: null });
  });

  it('zählt nur bestätigte Freunde', () => {
    expect(friendIds(rows, 'me').sort()).toEqual(['anna', 'ben']);
  });
});

describe('Unterhaltungen', () => {
  it('gruppiert nach Gegenüber, neueste zuerst, und zählt Ungelesenes', () => {
    const list = groupConversations(
      [
        m('a', 'anna', 'me', '10:00'),
        m('b', 'me', 'anna', '10:05'),
        m('c', 'ben', 'me', '09:00'),
        m('d', 'anna', 'me', '10:10'),
        m('e', 'ben', 'me', '08:00', true),
      ],
      'me',
    );
    expect(list.map((c) => c.otherId)).toEqual(['anna', 'ben']);
    expect(list[0].last.id).toBe('d');
    expect(list[0].unread).toBe(2);
    expect(list[1].unread).toBe(1);
  });

  it('zählt eigene Nachrichten nie als ungelesen', () => {
    expect(groupConversations([m('a', 'me', 'anna', '10:00')], 'me')[0].unread).toBe(0);
    expect(groupConversations([], 'me')).toEqual([]);
  });
});

describe('Suche', () => {
  it('entfernt Zeichen mit Sonderbedeutung und das @', () => {
    expect(sanitizeSearch('  @Anna_1 ')).toBe('Anna_1');
    expect(sanitizeSearch('a%b,c(d)e*')).toBe('abcde');
    expect(sanitizeSearch('x'.repeat(50))).toHaveLength(30);
  });
});
