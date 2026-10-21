const tones = {
  click: [740, 0.055, "sine"],
  sparkle: [1175, 0.24, "sine"],
  doorway: [523, 0.48, "triangle"],
  bloom: [880, 0.3, "sine"],
  blessing: [659, 0.55, "sine"],
  bell: [988, 0.38, "sine"],
  gift: [784, 0.46, "triangle"],
  wish: [1047, 0.52, "sine"],
  collect: [1318, 0.32, "sine"],
};

const melodies = {
  fanfare: [
    [523.25, 0.15, 0, "sine"],
    [659.25, 0.15, 0.11, "sine"],
    [783.99, 0.18, 0.22, "sine"],
    [1046.5, 0.5, 0.35, "triangle"],
  ],
  celebrate: [
    [587.33, 0.14, 0, "sine"],
    [739.99, 0.14, 0.11, "sine"],
    [880, 0.16, 0.22, "sine"],
    [1174.66, 0.55, 0.34, "triangle"],
  ],
  treasure: [
    [784, 0.12, 0, "sine"],
    [1046.5, 0.14, 0.1, "sine"],
    [1318.5, 0.16, 0.22, "sine"],
    [1568, 0.45, 0.34, "triangle"],
  ],
  secret: [
    [659.25, 0.22, 0, "sine"],
    [830.61, 0.22, 0.16, "sine"],
    [987.77, 0.24, 0.32, "sine"],
    [1318.51, 0.6, 0.48, "triangle"],
  ],
  levelup: [
    [523.25, 0.12, 0, "sine"],
    [659.25, 0.12, 0.1, "sine"],
    [783.99, 0.12, 0.2, "sine"],
    [1046.5, 0.2, 0.3, "sine"],
    [1318.5, 0.45, 0.45, "triangle"],
  ],
  questcomplete: [
    [440, 0.14, 0, "sine"],
    [554.37, 0.14, 0.1, "sine"],
    [659.25, 0.16, 0.2, "sine"],
    [880, 0.45, 0.32, "triangle"],
  ],
  achievement: [
    [783.99, 0.1, 0, "sine"],
    [987.77, 0.1, 0.08, "sine"],
    [1174.66, 0.12, 0.16, "sine"],
    [1567.98, 0.4, 0.26, "triangle"],
  ],
};

export function createSoundManager() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let effectsGain = null;
  let ambienceGain = null;
  let ambienceOscillators = [];
  let ambienceNoise = null;
  let ambienceNoiseFilter = null;
  let ambienceChimeTimer = null;
  let ambienceChirpTimer = null;
  let effectsEnabled = false;
  let ambienceEnabled = false;
  let theme = "FAIRY_WORLD";

  const ensureContext = async () => {
    if (!AudioContextClass) throw new Error("Web Audio API is not supported by this browser.");
    if (!context) {
      context = new AudioContextClass();
      effectsGain = context.createGain();
      ambienceGain = context.createGain();
      effectsGain.gain.value = 0.2;
      ambienceGain.gain.value = 0;
      effectsGain.connect(context.destination);
      ambienceGain.connect(context.destination);
    }
    if (context.state === "suspended") await context.resume();
  };

  const updateAmbience = () => {
    if (!context || ambienceOscillators.length) return;
    const frequencies = theme === "DASHAIN_WORLD" ? [110, 164.81] : [174.61, 261.63];
    ambienceOscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index ? 0.14 : 0.1;
      oscillator.connect(gain).connect(ambienceGain);
      oscillator.start();
      return oscillator;
    });
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
    ambienceNoise = context.createBufferSource();
    ambienceNoise.buffer = buffer;
    ambienceNoise.loop = true;
    ambienceNoiseFilter = context.createBiquadFilter();
    ambienceNoiseFilter.type = "lowpass";
    ambienceNoiseFilter.frequency.value = theme === "DASHAIN_WORLD" ? 520 : 780;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.12;
    ambienceNoise.connect(ambienceNoiseFilter).connect(noiseGain).connect(ambienceGain);
    ambienceNoise.start();
  };

  const rampAmbience = () => {
    if (!context || !ambienceGain) return;
    const now = context.currentTime;
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setTargetAtTime(ambienceEnabled ? 0.16 : 0, now, 0.8);
  };

  const playAmbientChime = () => {
    if (!ambienceEnabled || !context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(theme === "DASHAIN_WORLD" ? 659 : 880, now);
    oscillator.frequency.exponentialRampToValueAtTime(theme === "DASHAIN_WORLD" ? 784 : 1175, now + 0.32);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.04, now + 0.05);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    oscillator.connect(envelope).connect(ambienceGain);
    oscillator.start(now);
    oscillator.stop(now + 0.95);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  };

  const playBirdChirp = () => {
    if (!ambienceEnabled || !context || context.state !== "running" || theme !== "FAIRY_WORLD") return;
    const now = context.currentTime;
    [1480, 1760].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.14);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + index * 0.14 + 0.12);
      envelope.gain.setValueAtTime(0.0001, now + index * 0.14);
      envelope.gain.exponentialRampToValueAtTime(0.035, now + index * 0.14 + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.15);
      oscillator.connect(envelope).connect(ambienceGain);
      oscillator.start(now + index * 0.14);
      oscillator.stop(now + index * 0.14 + 0.17);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        envelope.disconnect();
      }, { once: true });
    });
  };

  return {
    get effectsEnabled() { return effectsEnabled; },
    get ambienceEnabled() { return ambienceEnabled; },
    async setEffectsEnabled(enabled) {
      await ensureContext();
      effectsEnabled = enabled;
      effectsGain.gain.setTargetAtTime(enabled ? 0.2 : 0, context.currentTime, 0.04);
      return effectsEnabled;
    },
    async setAmbienceEnabled(enabled) {
      await ensureContext();
      ambienceEnabled = enabled;
      updateAmbience();
      if (ambienceOscillators.length) {
        const frequencies = theme === "DASHAIN_WORLD" ? [110, 164.81] : [174.61, 261.63];
        ambienceOscillators.forEach((oscillator, index) => {
          oscillator.frequency.setTargetAtTime(frequencies[index], context.currentTime, 0.8);
        });
      }
      if (ambienceNoiseFilter) ambienceNoiseFilter.frequency.setTargetAtTime(theme === "DASHAIN_WORLD" ? 520 : 780, context.currentTime, 1);
      window.clearInterval(ambienceChimeTimer);
      window.clearInterval(ambienceChirpTimer);
      if (enabled) {
        ambienceChimeTimer = window.setInterval(playAmbientChime, 18000);
        if (theme === "FAIRY_WORLD") ambienceChirpTimer = window.setInterval(playBirdChirp, 24000);
      }
      rampAmbience();
      return ambienceEnabled;
    },
    setTheme(nextTheme) {
      theme = nextTheme;
      if (!context || !ambienceOscillators.length) return;
      const frequencies = theme === "DASHAIN_WORLD" ? [110, 164.81] : [174.61, 261.63];
      ambienceOscillators.forEach((oscillator, index) => {
        oscillator.frequency.setTargetAtTime(frequencies[index], context.currentTime, 1.2);
      });
      if (ambienceNoiseFilter) ambienceNoiseFilter.frequency.setTargetAtTime(theme === "DASHAIN_WORLD" ? 520 : 780, context.currentTime, 1.2);
      if (ambienceEnabled) {
        window.clearInterval(ambienceChirpTimer);
        if (theme === "FAIRY_WORLD") ambienceChirpTimer = window.setInterval(playBirdChirp, 24000);
      }
    },
    play(name) {
      if (!effectsEnabled || !context || context.state !== "running") return;
      if (melodies[name]) {
        melodies[name].forEach(([frequency, duration, delay, waveform = "sine"]) => {
          const oscillator = context.createOscillator();
          const envelope = context.createGain();
          const startAt = context.currentTime + delay;
          oscillator.type = waveform;
          oscillator.frequency.setValueAtTime(frequency, startAt);
          oscillator.frequency.exponentialRampToValueAtTime(Math.max(160, frequency * 0.95), startAt + duration);
          envelope.gain.setValueAtTime(0.0001, startAt);
          envelope.gain.exponentialRampToValueAtTime(0.4, startAt + 0.02);
          envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
          oscillator.connect(envelope).connect(effectsGain);
          oscillator.start(startAt);
          oscillator.stop(startAt + duration + 0.03);
          oscillator.addEventListener("ended", () => {
            oscillator.disconnect();
            envelope.disconnect();
          }, { once: true });
        });
        return;
      }
      const [frequency, duration, waveform] = tones[name] ?? tones.sparkle;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const now = context.currentTime;
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(180, frequency * 0.72), now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.55, now + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope).connect(effectsGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        envelope.disconnect();
      }, { once: true });
    },
    async dispose() {
      if (!context) return;
      window.clearInterval(ambienceChimeTimer);
      window.clearInterval(ambienceChirpTimer);
      ambienceOscillators.forEach((oscillator) => oscillator.stop());
      ambienceOscillators = [];
      ambienceNoise?.stop();
      ambienceNoise?.disconnect();
      ambienceNoiseFilter?.disconnect();
      await context.close();
      context = null;
    },
  };
}
