/* Rally — chat-style sport skill-profile onboarding.
   Full-screen overlay that asks a few questions in a chat/messenger manner and
   hands the collected answers back via onComplete. */
import { useState, useEffect, useRef } from 'react';
import { getSportQuestions } from '../lib/api';
import { useLang } from '../LangContext';

const MASCOT = { name: 'Kico', emoji: '⚽' };

/* ---- API response → chat shape normalizers ----
   Questions come from GET /sports/:sport/questions. The backend shape isn't
   fixed, so we defensively accept a few common variants:
     • top level: an array of questions, or { questions: [...] }
     • a question's prompt: `bot` (array), or text/question/prompt/title (string)
     • a question's answers: `options` / `answers` / `choices` / `values`
     • an option: a plain string, or an object with label/text/name + value/id. */
function normalizeOption(o, j) {
  if (o == null) return { label: '', value: `o${j}` };
  if (typeof o === 'string' || typeof o === 'number') {
    return { label: String(o), value: String(o) };
  }
  const label = o.label ?? o.text ?? o.title ?? o.name ?? o.value ?? `Option ${j + 1}`;
  const value = o.value ?? o.id ?? o.key ?? o.slug ?? label;
  return { label: String(label), value: String(value) };
}

function normalizeQuestion(q, i) {
  const id = q.id ?? q.key ?? q.slug ?? q.name ?? `q${i}`;
  const botRaw = q.bot ?? q.messages ?? q.prompts ?? q.text ?? q.question ?? q.prompt ?? q.title ?? '';
  const bot = (Array.isArray(botRaw) ? botRaw : [botRaw]).map(String).filter(Boolean);
  const optsRaw = q.options ?? q.answers ?? q.choices ?? q.values ?? [];
  const options = (Array.isArray(optsRaw) ? optsRaw : []).map(normalizeOption);
  return { id: String(id), bot, options };
}

/* Turn the raw API payload into a list of questions with at least one option. */
function normalizeQuestions(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.questions)
      ? raw.questions
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
  return list.map(normalizeQuestion).filter((q) => q.bot.length && q.options.length);
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
let uidSeq = 0;
const uid = () => `m${Date.now()}_${uidSeq++}`;
// Pick a random acknowledgement from the (localised) list. Called only from
// async event handlers, never during render.
const randomAck = (acks) => acks[Math.floor(Math.random() * acks.length)];
const typingDelay = () => 550 + Math.random() * 350;

/* ---- rank reveal (presentation only) ----
   The rank is computed by the backend and returned in the `placement` block;
   here we only map the tier name to its colours and render the badge. Tiers
   follow the Iron → Challenger ladder. */
const TIER_STYLES = {
  iron:        { label: 'Iron',        color: '#7d7d82', glow: 'rgba(125,125,130,.32)' },
  bronze:      { label: 'Bronze',      color: '#c17a4a', glow: 'rgba(193,122,74,.35)' },
  silver:      { label: 'Silver',      color: '#a8b2bd', glow: 'rgba(168,178,189,.35)' },
  gold:        { label: 'Gold',        color: '#e0b23d', glow: 'rgba(224,178,61,.35)' },
  platinum:    { label: 'Platinum',    color: '#4fd1c5', glow: 'rgba(79,209,197,.35)' },
  emerald:     { label: 'Emerald',     color: '#33c481', glow: 'rgba(51,196,129,.35)' },
  diamond:     { label: 'Diamond',     color: '#6ab0f3', glow: 'rgba(106,176,243,.38)' },
  master:      { label: 'Master',      color: '#c58bf2', glow: 'rgba(197,139,242,.4)' },
  grandmaster: { label: 'Grandmaster', color: '#e0574a', glow: 'rgba(224,87,74,.4)' },
  challenger:  { label: 'Challenger',  color: '#f0d264', glow: 'rgba(240,210,100,.45)' },
};
const DEFAULT_TIER = { label: 'Unranked', color: '#8a94a6', glow: 'rgba(138,148,166,.3)' };

/* Turn the backend's POST /sports/:sport/profile response into the shape
   RankReveal expects. The scored rank lives in a `placement` block:
     placement.tier     → rank name  (Iron … Challenger)               → shown big + coloured
     placement.division → sub-division (IV–I; empty for Challenger)    → shown small
     placement.elo      → numeric score (also mirrored as top-level `rating`) */
export function normalizeRank(raw) {
  const p = raw?.placement ?? raw ?? {};
  const tierName = String(p.tier ?? '').trim();
  const key = tierName.toLowerCase();
  const style = TIER_STYLES[key] || DEFAULT_TIER;
  const division = { key, label: tierName || style.label, color: style.color, glow: style.glow };
  const tier = String(p.division ?? '').trim(); // roman sub-division, e.g. "III"
  const rating = Number(p.elo ?? raw?.rating ?? 0) || 0;
  const label = `${division.label}${tier ? ' ' + tier : ''}`;
  return { division, tier, rating, label };
}

function MascotAvatar({ size = 36 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_60%,black)] shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.52 }}
      aria-hidden="true">
      {MASCOT.emoji}
    </span>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2.5 chat-in">
      <MascotAvatar size={28} />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#1c2230] px-4 py-3.5">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: '.15s' }} />
        <span className="typing-dot" style={{ animationDelay: '.3s' }} />
      </div>
    </div>
  );
}

function BotBubble({ text }) {
  return (
    <div className="flex items-end gap-2.5 chat-in">
      <MascotAvatar size={28} />
      <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-[#1c2230] px-4 py-2.5 text-[15px] leading-relaxed text-white/90 shadow-sm">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div className="flex items-end justify-end gap-2.5 chat-in">
      <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[15px] font-500 leading-relaxed text-white shadow-sm">
        {text}
      </div>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-[13px] font-600 text-white">
        {'🙂'}
      </span>
    </div>
  );
}

function StepDivider({ n }) {
  const { t } = useLang();
  return (
    <div className="my-1 flex items-center gap-3 chat-in">
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">{t.onboarding.step} {n}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function RankReveal({ result, onContinue }) {
  const { t } = useLang();
  const { division, tier, rating } = result;
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className="mt-2 flex flex-col items-center gap-5 py-3 text-center">
      <div className={'rank-badge-in flex flex-col items-center gap-4' + (show ? ' rank-badge-show' : '')}>
        <div
          className="grid h-28 w-28 place-items-center rounded-full text-[13px] font-700 uppercase tracking-wide"
          style={{
            background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${division.color} 55%, white), ${division.color})`,
            boxShadow: `0 0 0 6px ${division.glow}, 0 18px 40px -12px ${division.glow}`,
          }}>
          <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="#0b0d13" strokeWidth="1.6">
            <path d="M12 2l2.5 5.5L20 8.5l-4.2 4 1 6-4.8-3-4.8 3 1-6L4 8.5l5.5-1z" strokeLinejoin="round" strokeLinecap="round" fill="rgba(11,13,19,.12)" />
          </svg>
        </div>
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/40">{t.onboarding.yourDivision}</div>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="font-display text-[28px] font-700" style={{ color: division.color }}>{division.label}</span>
            {tier && <span className="font-display text-[20px] font-700 text-white/50">{tier}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2">
          <span className="font-mono text-[13px] text-white/50">{t.onboarding.rating}</span>
          <span className="text-[16px] font-700 text-white">{rating.toLocaleString()}</span>
        </div>
      </div>
      <button onClick={onContinue}
        className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-[15px] font-600 text-white transition-all hover:brightness-110 active:translate-y-px">
        {t.onboarding.continueToReg}
      </button>
      <style>{`
        .rank-badge-in { opacity: 0; transform: scale(.82) translateY(10px); transition: opacity .5s ease, transform .5s cubic-bezier(.2,1.4,.4,1); }
        .rank-badge-show { opacity: 1; transform: scale(1) translateY(0); }
      `}</style>
    </div>
  );
}

function OptionPill({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="chat-in w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left text-[15px] font-500 text-white/90 transition-all hover:border-[var(--accent)]/60 hover:bg-white/[0.08] active:translate-y-px disabled:pointer-events-none disabled:opacity-40">
      {label}
    </button>
  );
}

export function ProfileOnboarding({ sport, sportLabel, name, onClose, onComplete, onSubmit }) {
  const { t } = useLang();
  const ob = t.onboarding;
  const [questions, setQuestions] = useState([]); // fetched from the API
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [loadKey, setLoadKey] = useState(0); // bumped to retry the fetch
  const [items, setItems] = useState([]); // stream of {type:'bot'|'user'|'divider', ...}
  const [typing, setTyping] = useState(false);
  const [qIndex, setQIndex] = useState(-1);
  const [optionsVisible, setOptionsVisible] = useState(false);
  // Drives the progress bar. Only ever increases (once per chosen answer), so
  // the bar can't fall back when the next question's options appear.
  const [answeredCount, setAnsweredCount] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null); // rank returned by the backend
  const [scoreState, setScoreState] = useState('idle'); // idle | scoring | error
  const answersRef = useRef({});
  const listRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  // Fetch the questionnaire for this sport slug from GET /sports/:sport/questions.
  useEffect(() => {
    let cancelled = false;
    getSportQuestions(sport)
      .then((raw) => {
        if (cancelled) return;
        const qs = normalizeQuestions(raw);
        if (!qs.length) { setLoadState('error'); return; }
        setQuestions(qs);
        setLoadState('ready');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [sport, loadKey]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items, typing, optionsVisible]);

  const sayBot = async (text) => {
    setTyping(true);
    await wait(typingDelay());
    setTyping(false);
    setItems((m) => [...m, { type: 'bot', id: uid(), text }]);
    await wait(120);
  };

  const askQuestion = async (i) => {
    setQIndex(i);
    setItems((m) => [...m, { type: 'divider', id: uid(), n: i + 1 }]);
    await wait(150);
    for (const line of questions[i].bot) await sayBot(line);
    setOptionsVisible(true);
  };

  // Kick off the chat once the questions have loaded.
  useEffect(() => {
    if (loadState !== 'ready' || runningRef.current) return;
    runningRef.current = true;
    (async () => {
      await wait(400);
      await sayBot(ob.greetingFn(MASCOT.name, MASCOT.emoji, sportLabel || ob.fallbackSport));
      await askQuestion(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState]);

  // Submit the collected answers to the backend, which scores them and returns
  // the division / tier / rating we reveal. Also used by the error "Try again".
  const finish = async () => {
    setScoreState('scoring');
    setTyping(true);
    try {
      const raw = onSubmit ? await onSubmit(answersRef.current) : {};
      setResult(normalizeRank(raw || {}));
      setTyping(false);
      setScoreState('idle');
      setDone(true);
    } catch {
      setTyping(false);
      setScoreState('error');
    }
  };

  const choose = async (opt) => {
    if (!optionsVisible) return;
    setOptionsVisible(false);
    answersRef.current[questions[qIndex].id] = opt.value;
    setAnsweredCount((c) => c + 1);
    setItems((m) => [...m, { type: 'user', id: uid(), text: opt.label }]);
    await wait(280);
    await sayBot(randomAck(ob.acks));
    const next = qIndex + 1;
    if (next < questions.length) {
      await wait(150);
      await askQuestion(next);
    } else {
      await wait(250);
      await sayBot(ob.allSetFn(name ? ', ' + name.split(' ')[0] : ''));
      await wait(200);
      await finish();
    }
  };

  const totalSteps = questions.length;
  const progressPct = done ? 100 : totalSteps ? Math.round((answeredCount / totalSteps) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b0d13]">
      {/* top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <MascotAvatar size={36} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out" style={{ width: `${Math.max(6, progressPct)}%` }} />
        </div>
        <button onClick={() => onClose()} aria-label="Close"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* chat stream */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" style={{ scrollBehavior: 'smooth' }}>
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {loadState === 'loading' && (
            <div className="flex items-center gap-2.5 chat-in">
              <MascotAvatar size={28} />
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[#1c2230] px-4 py-3 text-[14px] text-white/70">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" />
                {ob.loadingQuestions}
              </div>
            </div>
          )}
          {loadState === 'error' && (
            <div className="mt-6 flex flex-col items-center gap-4 py-6 text-center chat-in">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-[26px]">😕</span>
              <p className="max-w-xs text-[14.5px] leading-relaxed text-white/70">
                {ob.loadErrorFn((sportLabel || ob.fallbackSport).toLowerCase())}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setLoadState('loading'); setLoadKey((k) => k + 1); }}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-[14px] font-600 text-white transition-all hover:brightness-110">
                  {ob.tryAgain}
                </button>
                <button onClick={() => onClose()}
                  className="rounded-2xl border border-white/15 px-5 py-2.5 text-[14px] font-600 text-white/80 transition-all hover:bg-white/10">
                  {ob.close}
                </button>
              </div>
            </div>
          )}
          {items.map((it) => {
            if (it.type === 'divider') return <StepDivider key={it.id} n={it.n} />;
            if (it.type === 'bot') return <BotBubble key={it.id} text={it.text} />;
            return <UserBubble key={it.id} text={it.text} />;
          })}
          {typing && <TypingBubble />}
          {optionsVisible && !done && questions[qIndex] && (
            <div className="mt-1 flex flex-col gap-2">
              {questions[qIndex].options.map((opt) => (
                <OptionPill key={opt.value} label={opt.label} onClick={() => choose(opt)} />
              ))}
            </div>
          )}
          {scoreState === 'error' && !done && (
            <div className="mt-4 flex flex-col items-center gap-3 py-3 text-center chat-in">
              <p className="max-w-xs text-[14.5px] leading-relaxed text-white/70">{ob.scoreError}</p>
              <button onClick={() => finish()}
                className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-[14px] font-600 text-white transition-all hover:brightness-110">
                {ob.tryAgain}
              </button>
            </div>
          )}
          {done && result && (
            <div className="chat-in">
              <RankReveal result={result} onContinue={() => onComplete(answersRef.current, result)} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes chatIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        .chat-in { animation: chatIn .28s ease both; }
        .typing-dot { width:6px; height:6px; border-radius:50%; background: rgba(255,255,255,.55); display:inline-block; animation: typingBounce 1s ease-in-out infinite; }
        @keyframes typingBounce { 0%,60%,100%{ transform: translateY(0); opacity:.5; } 30%{ transform: translateY(-4px); opacity:1; } }
      `}</style>
    </div>
  );
}
