/* Rally — chat-style sport skill-profile onboarding. Exports ProfileOnboarding to window. */
const { useState: useStateO, useEffect: useEffectO, useRef: useRefO } = React;

const MASCOT = { name: "Kico", emoji: "⚽" };
const ACKS = ["Nice one!", "Great choice!", "Love that!", "Good stuff!", "Solid pick!"];

/* Hardcoded questionnaires. "football" gets sport-specific questions;
   every other sport falls back to a generic set (still tailored by label). */
const QUESTIONNAIRES = {
  football: [
    {
      id: "position",
      bot: [`Hey! I'm ${MASCOT.name} ${MASCOT.emoji} — let's set up your football profile.`, "First up — what position do you usually play?"],
      options: [
        { label: "Goalkeeper", value: "gk" },
        { label: "Defender", value: "def" },
        { label: "Midfielder", value: "mid" },
        { label: "Forward", value: "fwd" },
      ],
    },
    {
      id: "experience",
      bot: ["How would you describe your playing experience?"],
      options: [
        { label: "Just starting out", value: "beginner" },
        { label: "Recreational player", value: "recreational" },
        { label: "Competitive club", value: "competitive" },
        { label: "Semi-pro / pro", value: "pro" },
      ],
    },
    {
      id: "foot",
      bot: ["Which foot do you favor?"],
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Both equally", value: "both" },
      ],
    },
    {
      id: "frequency",
      bot: ["How often do you play these days?"],
      options: [
        { label: "A few times a year", value: "rarely" },
        { label: "Monthly", value: "monthly" },
        { label: "Weekly", value: "weekly" },
        { label: "Multiple times a week", value: "frequent" },
      ],
    },
    {
      id: "rating",
      bot: ["Last one — how would you rate your overall skill level?"],
      options: [
        { label: "Beginner", value: "beginner" },
        { label: "Intermediate", value: "intermediate" },
        { label: "Advanced", value: "advanced" },
        { label: "Elite", value: "elite" },
      ],
    },
  ],
  default: (sportLabel) => [
    {
      id: "experience",
      bot: [`Hey! I'm ${MASCOT.name} ${MASCOT.emoji} — let's build your ${sportLabel} profile.`, `How would you describe your experience with ${sportLabel.toLowerCase()}?`],
      options: [
        { label: "Just starting out", value: "beginner" },
        { label: "Recreational", value: "recreational" },
        { label: "Competitive", value: "competitive" },
        { label: "Semi-pro / pro", value: "pro" },
      ],
    },
    {
      id: "frequency",
      bot: [`How often do you play ${sportLabel.toLowerCase()}?`],
      options: [
        { label: "A few times a year", value: "rarely" },
        { label: "Monthly", value: "monthly" },
        { label: "Weekly", value: "weekly" },
        { label: "Multiple times a week", value: "frequent" },
      ],
    },
    {
      id: "fitness",
      bot: ["How's your current fitness level?"],
      options: [
        { label: "Building up", value: "building" },
        { label: "Solid", value: "solid" },
        { label: "Very fit", value: "fit" },
        { label: "Elite conditioning", value: "elite" },
      ],
    },
    {
      id: "rating",
      bot: ["Last one — overall, how would you rate your skill?"],
      options: [
        { label: "Beginner", value: "beginner" },
        { label: "Intermediate", value: "intermediate" },
        { label: "Advanced", value: "advanced" },
        { label: "Elite", value: "elite" },
      ],
    },
  ],
};

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
let uidSeq = 0;
const uid = () => `m${Date.now()}_${uidSeq++}`;

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
        <span className="typing-dot" style={{ animationDelay: ".15s" }} />
        <span className="typing-dot" style={{ animationDelay: ".3s" }} />
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
        {"🙂"}
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

function ProfileOnboarding({ sport, sportLabel, name, onClose, onComplete }) {
  const questions = QUESTIONNAIRES[sport] || QUESTIONNAIRES.default(sportLabel || "sport");
  const [items, setItems] = useStateO([]); // stream of {type:'bot'|'user'|'divider', ...}
  const [typing, setTyping] = useStateO(false);
  const [qIndex, setQIndex] = useStateO(-1);
  const [optionsVisible, setOptionsVisible] = useStateO(false);
  const [done, setDone] = useStateO(false);
  const answersRef = useRefO({});
  const listRef = useRefO(null);
  const runningRef = useRefO(false);

  useEffectO(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  useEffectO(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items, typing, optionsVisible]);

  const sayBot = async (text) => {
    setTyping(true);
    await wait(550 + Math.random() * 350);
    setTyping(false);
    setItems((m) => [...m, { type: "bot", id: uid(), text }]);
    await wait(120);
  };

  const askQuestion = async (i) => {
    setQIndex(i);
    setItems((m) => [...m, { type: "divider", id: uid(), n: i + 1 }]);
    await wait(150);
    for (const line of questions[i].bot) await sayBot(line);
    setOptionsVisible(true);
  };

  useEffectO(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    (async () => {
      await wait(400);
      await askQuestion(0);
    })();
  }, []);

  const choose = async (opt) => {
    if (!optionsVisible) return;
    setOptionsVisible(false);
    answersRef.current[questions[qIndex].id] = opt.value;
    setItems((m) => [...m, { type: "user", id: uid(), text: opt.label }]);
    await wait(280);
    await sayBot(ACKS[Math.floor(Math.random() * ACKS.length)]);
    const next = qIndex + 1;
    if (next < questions.length) {
      await wait(150);
      await askQuestion(next);
    } else {
      await wait(250);
      await sayBot(`You're all set${name ? ", " + name.split(" ")[0] : ""}! Let's find your level.`);
      setDone(true);
    }
  };

  const totalSteps = questions.length;
  const progressPct = done ? 100 : Math.round(((qIndex + (optionsVisible ? 0 : 0.4)) / totalSteps) * 100);

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
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" style={{ scrollBehavior: "smooth" }}>
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {items.map((it) => {
            if (it.type === "divider") return <StepDivider key={it.id} n={it.n} />;
            if (it.type === "bot") return <BotBubble key={it.id} text={it.text} />;
            return <UserBubble key={it.id} text={it.text} />;
          })}
          {typing && <TypingBubble />}
          {optionsVisible && !done && (
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

Object.assign(window, { ProfileOnboarding });
