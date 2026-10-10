import { matchTokens, rankMatches, type MatchItem } from '../lostFoundMatch';

describe('lostFoundMatch', () => {
  describe('matchTokens', () => {
    it('handles empty and null input', () => {
      expect(matchTokens(null).size).toBe(0);
      expect(matchTokens('').size).toBe(0);
    });

    it('tokenizes English words and filters stopwords', () => {
      const tokens = matchTokens('Lost my black wallet near the cafeteria');
      expect(tokens.has('black')).toBe(true);
      expect(tokens.has('wallet')).toBe(true);
      expect(tokens.has('cafeteria')).toBe(true);
      // Stopwords filtered
      expect(tokens.has('lost')).toBe(false);
      expect(tokens.has('the')).toBe(false);
      expect(tokens.has('near')).toBe(false);
    });

    it('tokenizes Bangla Unicode words properly', () => {
      const tokens = matchTokens('একটি লাল রঙের আইডি কার্ড এবং বই পাওয়া গেছে');
      expect(tokens.has('একটি')).toBe(true);
      expect(tokens.has('লাল')).toBe(true);
      expect(tokens.has('আইডি')).toBe(true);
      expect(tokens.has('কার্ড')).toBe(true);
      expect(tokens.has('বই')).toBe(true);
    });

    it('keeps 2-letter tokens like ID, bag, etc.', () => {
      const tokens = matchTokens('Student ID card');
      expect(tokens.has('id')).toBe(true);
      expect(tokens.has('student')).toBe(true);
      expect(tokens.has('card')).toBe(true);
    });
  });

  describe('rankMatches', () => {
    const candidateItems: MatchItem[] = [
      {
        id: '1',
        title: 'Found black wallet',
        description: 'Found near cafeteria building 2',
        type: 'Found',
        category: 'Personal',
        status: 'Open',
        created_at: '2026-10-10T10:00:00Z',
        poster_id: 'user-b',
        location: 'Cafeteria',
      },
      {
        id: '2',
        title: 'Found red calculator',
        description: 'Casio scientific calculator',
        type: 'Found',
        category: 'Electronics',
        status: 'Open',
        created_at: '2026-10-10T09:00:00Z',
        poster_id: 'user-c',
        location: 'Exam Hall',
      },
      {
        id: '3',
        title: 'Found student ID card',
        description: 'ID card for CSE student',
        type: 'Found',
        category: 'Documents',
        status: 'Open',
        created_at: '2026-10-10T08:00:00Z',
        poster_id: 'user-d',
        location: 'Library',
      },
      {
        id: '4',
        title: 'Found leather wallet',
        description: 'Brown leather wallet with money',
        type: 'Found',
        category: 'Personal',
        status: 'Open',
        created_at: '2026-10-10T07:00:00Z',
        poster_id: 'user-a', // Own item!
        location: 'Campus Grounds',
      },
    ];

    it('excludes poster own items', () => {
      const target = {
        title: 'Lost brown wallet',
        description: 'Lost somewhere on campus',
        poster_id: 'user-a',
      };
      const results = rankMatches(target, candidateItems);
      // Item 4 is by user-a so it must not be included
      expect(results.some(r => r.id === '4')).toBe(false);
    });

    it('excludes completely unrelated items with score 0 (NO false positives)', () => {
      const target = {
        title: 'Lost umbrella',
        description: 'Blue folding umbrella',
        poster_id: 'user-x',
      };
      // None of the candidate items match umbrella
      const results = rankMatches(target, candidateItems);
      expect(results.length).toBe(0);
    });

    it('correctly ranks items with matching title tokens higher', () => {
      const target = {
        title: 'Lost black wallet',
        description: 'Lost in cafeteria',
        poster_id: 'user-x',
      };
      const results = rankMatches(target, candidateItems);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('1'); // Has more matches ('black', 'wallet', 'cafeteria')
      expect(results[1].id).toBe('4'); // Matches 'wallet'
    });

    it('matches Bangla items correctly', () => {
      const banglaCandidates: MatchItem[] = [
        {
          id: '10',
          title: 'পাওয়া গেছে আইডি কার্ড',
          description: 'লাইব্রেরিতে পাওয়া গেছে',
          type: 'Found',
          category: 'Documents',
          status: 'Open',
          created_at: '2026-10-10T11:00:00Z',
          poster_id: 'user-p',
          location: 'Library',
        },
      ];

      const target = {
        title: 'হারিয়ে গেছে আইডি কার্ড',
        description: 'লাইব্রেরির সামনে হারিয়েছি',
        poster_id: 'user-q',
      };

      const results = rankMatches(target, banglaCandidates);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('10');
    });
  });
});
