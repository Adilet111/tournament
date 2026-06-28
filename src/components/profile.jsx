/* Rally — "create a sport profile" overlay.
   Available once the user is signed in (has a session). Lets them set up a
   profile for one of the supported sports. */
import { useEffect, useState } from 'react';
import { SPORTS, LOCATIONS, CATEGORIES } from '../data';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { Btn, SportTag } from './primitives';

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="ring-accent mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-accent" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, render }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="ring-accent mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent">
        {options.map((o) => <option key={o.id} value={o.id}>{render ? render(o.id) : o.label}</option>)}
      </select>
    </label>
  );
}

export function ProfileModal({ onClose }) {
  const { t } = useLang();
  const p = t.profile;
  const { user, addProfile } = useSession();
  const [stage, setStage] = useState('form'); // form | done
  const [form, setForm] = useState({
    sport: SPORTS[0].id,
    displayName: user?.name || '',
    category: CATEGORIES[0].id,
    location: LOCATIONS[0].id,
    bio: '',
  });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.displayName.trim().length > 1;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    addProfile(form);
    setStage('done');
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{p.eyebrow}</span>
            <h3 className="font-display text-[20px] font-700 leading-snug text-ink-900">{p.title}</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-700 hover:bg-ink-50" aria-label="Close">✕</button>
        </div>

        {stage === 'form' ? (
          <form onSubmit={submit} className="space-y-3.5 p-6">
            <SelectField label={p.sportLbl} value={form.sport} onChange={set('sport')}
              options={SPORTS} render={(id) => t.data.sports[id] ?? id} />
            <Field label={p.nameLbl} value={form.displayName} onChange={set('displayName')} placeholder={p.namePlaceholder} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label={p.categoryLbl} value={form.category} onChange={set('category')}
                options={CATEGORIES} render={(id) => t.data.categories[id] ?? id} />
              <SelectField label={p.cityLbl} value={form.location} onChange={set('location')}
                options={LOCATIONS} render={(id) => t.data.locations[id] ?? id} />
            </div>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{p.bioLbl}</span>
              <textarea value={form.bio} onChange={(e) => set('bio')(e.target.value)} rows={3} placeholder={p.bioPlaceholder}
                className="ring-accent mt-1.5 w-full resize-none rounded-xl border border-ink-200 px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-accent" />
            </label>
            <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4">
              <Btn variant="ghost" size="md" type="button" onClick={onClose}>{p.cancel}</Btn>
              <Btn variant="primary" size="md" type="submit" disabled={!valid}>{p.create}</Btn>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="font-display mt-4 text-[22px] font-700 text-ink-900">{p.doneTitle}</h3>
            <div className="mx-auto mt-3 inline-flex items-center gap-2">
              <SportTag sport={form.sport} />
              <span className="text-[13.5px] text-ink-500">· {form.displayName}</span>
            </div>
            <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
              {p.doneBody}
            </p>
            <Btn variant="dark" size="md" className="mt-6" onClick={onClose}>{p.done}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
