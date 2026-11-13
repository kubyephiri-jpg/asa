// Ringback tone: the "toop-toop ... toop-toop" the CALLER hears while the other phone rings.
// Generated with Web Audio so no sound file is needed. Call startRingback() when the
// outgoing call begins and stopRingback() when it is answered / ended.
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let master: GainNode | null = null;

function beep(c: AudioContext, out: GainNode, at: number, len: number) {
  for (const f of [425, 450]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.02);
    g.gain.setValueAtTime(0.22, at + len - 0.03);
    g.gain.linearRampToValueAtTime(0, at + len);
    o.connect(g); g.connect(out);
    o.start(at); o.stop(at + len + 0.02);
  }
}

function pattern() {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.05;
  beep(ctx, master, t, 0.4);          // toop
  beep(ctx, master, t + 0.6, 0.4);    // toop
}

export function startRingback() {
  if (timer) return;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    void ctx!.resume?.();
    master = ctx!.createGain();
    master.gain.value = 1;
    master.connect(ctx!.destination);
    pattern();
    timer = setInterval(pattern, 3000);
  } catch { /* the tone is optional */ }
}

export function stopRingback() {
  if (timer) { clearInterval(timer); timer = null; }
  try { master?.disconnect(); } catch { /* ignore */ }
  master = null;
}
