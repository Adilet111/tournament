/* Rally — competitions dataset. Attached to window for use across babel scripts. */
(function () {
  const SPORTS = [
    { id: "running",   label: "Running" },
    { id: "cycling",   label: "Cycling" },
    { id: "tennis",    label: "Tennis" },
    { id: "football",  label: "Football" },
    { id: "swimming",  label: "Swimming" },
    { id: "triathlon", label: "Triathlon" },
    { id: "basketball",label: "Basketball" },
    { id: "padel",     label: "Padel" },
  ];

  const LOCATIONS = [
    { id: "london",    label: "London, UK" },
    { id: "berlin",    label: "Berlin, DE" },
    { id: "barcelona", label: "Barcelona, ES" },
    { id: "amsterdam", label: "Amsterdam, NL" },
    { id: "lisbon",    label: "Lisbon, PT" },
    { id: "milan",     label: "Milan, IT" },
  ];

  const WINDOWS = [
    { id: "week",   label: "This week" },
    { id: "month",  label: "This month" },
    { id: "later",  label: "Later" },
  ];

  const CATEGORIES = [
    { id: "open",         label: "Open" },
    { id: "amateur",      label: "Amateur" },
    { id: "intermediate", label: "Intermediate" },
    { id: "pro",          label: "Pro" },
  ];

  // date is ISO; window is precomputed for the demo so filtering is deterministic.
  const COMPETITIONS = [
    { id: "c1",  title: "Thames Half Marathon",        sport: "running",    location: "london",    window: "week",  date: "Jun 18, 2026", price: 32,  spots: 41,  cats: ["amateur","intermediate","pro"], distance: "21.1 km" },
    { id: "c2",  title: "Tiergarten Crit Series",       sport: "cycling",    location: "berlin",    window: "week",  date: "Jun 20, 2026", price: 28,  spots: 12,  cats: ["intermediate","pro"],            distance: "40 km" },
    { id: "c3",  title: "Barceloneta Open Cup",         sport: "tennis",     location: "barcelona", window: "month", date: "Jul 04, 2026", price: 45,  spots: 24,  cats: ["open","amateur","intermediate"], distance: "Singles" },
    { id: "c4",  title: "Canal District 5-a-side",      sport: "football",   location: "amsterdam", window: "week",  date: "Jun 21, 2026", price: 18,  spots: 6,   cats: ["amateur","open"],                distance: "5-a-side" },
    { id: "c5",  title: "Tagus River Open Water",       sport: "swimming",   location: "lisbon",    window: "month", date: "Jul 11, 2026", price: 35,  spots: 58,  cats: ["amateur","intermediate","pro"],  distance: "3 km" },
    { id: "c6",  title: "Navigli Sprint Triathlon",     sport: "triathlon",  location: "milan",     window: "month", date: "Jul 19, 2026", price: 64,  spots: 30,  cats: ["amateur","intermediate","pro"],  distance: "Sprint" },
    { id: "c7",  title: "Hackney Marsh 3v3",            sport: "basketball", location: "london",    window: "month", date: "Jul 02, 2026", price: 22,  spots: 16,  cats: ["open","amateur"],                distance: "3v3" },
    { id: "c8",  title: "Poblenou Padel Slam",          sport: "padel",      location: "barcelona", window: "later", date: "Aug 09, 2026", price: 40,  spots: 32,  cats: ["amateur","intermediate"],        distance: "Doubles" },
    { id: "c9",  title: "Vondelpark Mile",              sport: "running",    location: "amsterdam", window: "week",  date: "Jun 19, 2026", price: 15,  spots: 88,  cats: ["open","amateur","intermediate","pro"], distance: "1.6 km" },
    { id: "c10", title: "Grunewald Gravel Grind",       sport: "cycling",    location: "berlin",    window: "later", date: "Aug 15, 2026", price: 38,  spots: 54,  cats: ["amateur","intermediate","pro"],  distance: "80 km" },
    { id: "c11", title: "Lisbon Coastal Tennis Ladder", sport: "tennis",     location: "lisbon",    window: "month", date: "Jul 26, 2026", price: 30,  spots: 20,  cats: ["amateur","intermediate"],        distance: "Singles" },
    { id: "c12", title: "Milan Lakes Triathlon",        sport: "triathlon",  location: "milan",     window: "later", date: "Aug 23, 2026", price: 72,  spots: 19,  cats: ["intermediate","pro"],            distance: "Olympic" },
  ];

  function labelFor(list, id) {
    const m = list.find((x) => x.id === id);
    return m ? m.label : id;
  }

  /* ---- per-sport skill profiles (demo persistence via localStorage) ---- */
  const PROFILE_KEY = "rally:profiles";
  function readProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function hasProfile(sport) { return !!readProfiles()[sport]; }
  function getProfile(sport) { return readProfiles()[sport] || null; }
  function saveProfile(sport, answers) {
    const all = readProfiles();
    all[sport] = { answers, completedAt: new Date().toISOString() };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(all)); } catch (e) {}
    return all[sport];
  }

  window.RALLY = {
    SPORTS, LOCATIONS, WINDOWS, CATEGORIES, COMPETITIONS,
    sportLabel: (id) => labelFor(SPORTS, id),
    locationLabel: (id) => labelFor(LOCATIONS, id),
    windowLabel: (id) => labelFor(WINDOWS, id),
    categoryLabel: (id) => labelFor(CATEGORIES, id),
    hasProfile, getProfile, saveProfile,
  };
})();
