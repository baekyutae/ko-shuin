let ctx: AudioContext | null = null;

/** 인장이 찍힐 때 '쿵' 하는 짧은 소리와 진동 */
export function pressFeedback() {
  try {
    navigator.vibrate?.([18, 40, 28]);
  } catch {
    /* 진동 미지원 */
  }
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  } catch {
    /* 오디오 미지원 */
  }
}
