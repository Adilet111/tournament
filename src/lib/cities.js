/* Rally — cities from GET /cities, replacing the old hardcoded LOCATIONS list.
   Each city is { slug, en, ru }; tournaments reference the slug in `city`.
   Fetched once per page load and cached module-wide (same pattern as the
   tournament cache in interactive.jsx). */
import { useEffect, useState } from 'react';
import { listCities } from './api';

let _cache = null;
let _promise = null;

export function fetchCities() {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = listCities()
      .then((d) => { _cache = Array.isArray(d) ? d : []; return _cache; })
      .catch(() => { _promise = null; return []; });
  }
  return _promise;
}

export function useCities() {
  const [cities, setCities] = useState(_cache || []);
  useEffect(() => {
    if (_cache) return undefined;
    let on = true;
    fetchCities().then((d) => { if (on) setCities(d); });
    return () => { on = false; };
  }, []);
  return cities;
}

/* Find a city by slug or (for legacy rows that stored free text) by its
   English/Russian name, case-insensitively. */
function findCity(cities, value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return cities.find((c) => c.slug === v || c.en.toLowerCase() === v || c.ru.toLowerCase() === v) || null;
}

/* Canonical slug for a tournament's `city` value, '' when unknown. */
export function citySlug(cities, value) {
  return findCity(cities, value)?.slug || '';
}

/* Localized display name; falls back to the raw stored text for unknown cities. */
export function cityLabel(cities, value, lang) {
  const hit = findCity(cities, value);
  if (hit) return lang === 'ru' ? hit.ru : hit.en;
  return value ? String(value) : '';
}
