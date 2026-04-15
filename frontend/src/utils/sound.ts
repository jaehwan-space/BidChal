// Web Audio API 기반 효과음 생성기
let audioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (frequency: number, type: OscillatorType, duration: number, volume = 0.5) => {
  if (!audioCtx) return;
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

// 입찰 들어왔을 때 (경쾌한 코인 소리)
export const playBidSound = () => {
  if (!audioCtx) return;
  playTone(987.77, 'sine', 0.1, 0.4); // B5
  setTimeout(() => playTone(1318.51, 'sine', 0.2, 0.4), 80); // E6
};

// 낙찰 시 (축하 빰빰빰)
export const playSoldSound = () => {
  if (!audioCtx) return;
  playTone(523.25, 'triangle', 0.2, 0.5); // C5
  setTimeout(() => playTone(659.25, 'triangle', 0.2, 0.5), 150); // E5
  setTimeout(() => playTone(783.99, 'triangle', 0.4, 0.5), 300); // G5
  setTimeout(() => playTone(1046.50, 'triangle', 0.6, 0.5), 450); // C6
};

// 유찰 시 (실망스러운 띠로리)
export const playPassedSound = () => {
  if (!audioCtx) return;
  playTone(329.63, 'sawtooth', 0.3, 0.3); // E4
  setTimeout(() => playTone(311.13, 'sawtooth', 0.3, 0.3), 200); // Eb4
  setTimeout(() => playTone(293.66, 'sawtooth', 0.3, 0.3), 400); // D4
  setTimeout(() => playTone(261.63, 'sawtooth', 0.6, 0.3), 600); // C4
};

// 10초 이하 똑딱 카운트다운
export const playTickSound = () => {
  if (!audioCtx) return;
  playTone(800, 'square', 0.05, 0.1);
};
