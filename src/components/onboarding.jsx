/* Rally — chat-style sport skill-profile onboarding.
   Full-screen overlay that asks a few questions in a chat/messenger manner and
   hands the collected answers back via onComplete. */
import { useState, useEffect, useRef } from 'react';
import { getSportQuestions } from '../lib/api';

const MASCOT = { name: 'Kico', emoji: '⚽' };
const ACKS = ['Nice one!', 'Great choice!', 'Love that!', 'Good stuff!', 'Solid pick!'];

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
// Kept at module scope (not inside the component) so the randomness lives
// outside render — see react-hooks/purity.
const randomAck = () => ACKS[Math.floor(Math.random() * ACKS.length)];
const typingDelay = () => 550 + Math.random() * 350;

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
  return (
    <div className="my-1 flex items-center gap-3 chat-in">
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">Step {n}</span>
      <span className="h-px flex-1 bg-white/10" />
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

export function ProfileOnboarding({ sport, sportLabel, name, token, onClose, onComplete }) {
  const [questions, setQuestions] = useState([]); // fetched from the API
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [loadKey, setLoadKey] = useState(0); // bumped to retry the fetch
  const [items, setItems] = useState([]); // stream of {type:'bot'|'user'|'divider', ...}
  const [typing, setTyping] = useState(false);
  const [qIndex, setQIndex] = useState(-1);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [done, setDone] = useState(false);
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
    getSportQuestions(sport, token)
      .then((raw) => {
        if (cancelled) return;
        const qs = normalizeQuestions(raw);
        if (!qs.length) { setLoadState('error'); return; }
        setQuestions(qs);
        setLoadState('ready');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [sport, token, loadKey]);

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
      await sayBot(`Hey! I'm ${MASCOT.name} ${MASCOT.emoji} — let's set up your ${sportLabel || 'sport'} profile.`);
      await askQuestion(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState]);

  const choose = async (opt) => {
    if (!optionsVisible) return;
    setOptionsVisible(false);
    answersRef.current[questions[qIndex].id] = opt.value;
    setItems((m) => [...m, { type: 'user', id: uid(), text: opt.label }]);
    await wait(280);
    await sayBot(randomAck());
    const next = qIndex + 1;
    if (next < questions.length) {
      await wait(150);
      await askQuestion(next);
    } else {
      await wait(250);
      await sayBot(`You're all set${name ? ', ' + name.split(' ')[0] : ''}! Let's find your level.`);
      setDone(true);
    }
  };

  const totalSteps = questions.length;
  const progressPct = done ? 100 : totalSteps ? Math.round(((qIndex + (optionsVisible ? 0 : 0.4)) / totalSteps) * 100) : 0;

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
                Loading your questions…
              </div>
            </div>
          )}
          {loadState === 'error' && (
            <div className="mt-6 flex flex-col items-center gap-4 py-6 text-center chat-in">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-[26px]">😕</span>
              <p className="max-w-xs text-[14.5px] leading-relaxed text-white/70">
                Couldn't load the {(sportLabel || 'sport').toLowerCase()} questions right now.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setLoadState('loading'); setLoadKey((k) => k + 1); }}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-[14px] font-600 text-white transition-all hover:brightness-110">
                  Try again
                </button>
                <button onClick={() => onClose()}
                  className="rounded-2xl border border-white/15 px-5 py-2.5 text-[14px] font-600 text-white/80 transition-all hover:bg-white/10">
                  Close
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
          {done && (
            <div className="mt-3 flex flex-col items-center gap-4 py-4 text-center chat-in">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--accent)]/15 text-[32px]">🎉</span>
              <button onClick={() => onComplete(answersRef.current)}
                className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-[15px] font-600 text-white transition-all hover:brightness-110 active:translate-y-px">
                Continue to registration
              </button>
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
