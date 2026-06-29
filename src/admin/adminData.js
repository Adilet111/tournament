/* Rally Admin — organizer demo data, derived from the shared competition data. */
import { COMPETITIONS } from '../data';

// Mark which competitions this organizer "owns" + add capacity + status.
const OWNED_IDS = ['c1', 'c2', 'c4', 'c7', 'c9'];
const STATUS = { c1: 'live', c2: 'live', c4: 'draft', c7: 'live', c9: 'closed' };
const CAPACITY = { c1: 300, c2: 80, c4: 40, c7: 64, c9: 120 };

export const owned = COMPETITIONS.filter((c) => OWNED_IDS.includes(c.id)).map((c) => {
  const cap = CAPACITY[c.id];
  const registered = cap - c.spots;
  return {
    ...c,
    status: STATUS[c.id],
    capacity: cap,
    registered,
    fill: Math.round((registered / cap) * 100),
    revenue: registered * c.price,
  };
});

const FIRST = ['Alex', 'Sam', 'Jordan', 'Maya', 'Liam', 'Noa', 'Eve', 'Theo', 'Ravi', 'Ines', 'Kai', 'Lena', 'Omar', 'Tess', 'Ben', 'Aria'];
const LAST = ['Morgan', 'Reyes', 'Okafor', 'Nguyen', 'Cole', 'Bauer', 'Silva', 'Khan', 'Rossi', 'Adler', 'Mensah', 'Park', 'Haas', 'Vidal'];
const rnd = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// Build a registrations list across owned comps.
export const REGISTRATIONS = [];
let rid = 1;
owned.forEach((c, ci) => {
  const n = Math.min(8, Math.max(3, Math.round(c.registered / 12)));
  for (let i = 0; i < n; i++) {
    const s = rid * 7.3 + ci * 2.1;
    const fn = FIRST[Math.floor(rnd(s) * FIRST.length)];
    const ln = LAST[Math.floor(rnd(s + 1) * LAST.length)];
    const cat = c.cats[Math.floor(rnd(s + 2) * c.cats.length)];
    const days = Math.floor(rnd(s + 3) * 14);
    const paid = rnd(s + 4) > 0.18;
    REGISTRATIONS.push({
      id: 'r' + rid,
      name: fn + ' ' + ln,
      email: (fn + '.' + ln).toLowerCase() + '@email.com',
      comp: c.id,
      compTitle: c.title,
      sport: c.sport,
      category: cat,
      paid,
      amount: c.price,
      ago: days === 0 ? 'today' : days + 'd ago',
      days,
    });
    rid++;
  }
});
REGISTRATIONS.sort((a, b) => a.days - b.days);

export const SPONSORS = [
  { id: 's1', name: 'Strava+', category: 'Fitness app', status: 'active', deal: 4500, comps: ['c1', 'c9'], reach: 'fitness · endurance' },
  { id: 's2', name: 'VeloGear', category: 'Cycling kit', status: 'active', deal: 3200, comps: ['c2'], reach: 'cycling' },
  { id: 's3', name: 'HydraFuel', category: 'Sports nutrition', status: 'pending', deal: 2800, comps: ['c1', 'c7'], reach: 'multi-sport' },
  { id: 's4', name: 'Northwave', category: 'Footwear', status: 'invited', deal: 5000, comps: [], reach: 'running · trail' },
  { id: 's5', name: 'CityFit Studios', category: 'Local gyms', status: 'pending', deal: 1500, comps: ['c4'], reach: 'amateur · local' },
];

export const PROMOTIONS = [
  { id: 'p1', name: 'Thames Half — Early Bird', comp: 'c1', type: 'Discount code', status: 'active', metric: 'EARLY20', spend: 0, result: '62 uses', budget: 0 },
  { id: 'p2', name: 'Featured in Running search', comp: 'c1', type: 'Search boost', status: 'active', metric: 'London · Running', spend: 240, result: '1,840 views', budget: 400 },
  { id: 'p3', name: 'Crit Series — Nearby invite', comp: 'c2', type: 'Targeted invite', status: 'active', metric: 'Berlin · 25km', spend: 120, result: '310 sent', budget: 200 },
  { id: 'p4', name: '3v3 Social push', comp: 'c7', type: 'Ad campaign', status: 'paused', metric: 'Instagram', spend: 180, result: '9,200 impr.', budget: 300 },
  { id: 'p5', name: 'Vondelpark Mile — Boost', comp: 'c9', type: 'Search boost', status: 'ended', metric: 'Amsterdam', spend: 150, result: '2,100 views', budget: 150 },
];
