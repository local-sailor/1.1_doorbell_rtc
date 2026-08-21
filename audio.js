export function createDoorbellAudio() {
  let audioContext = null;
  let activeRingInterval = null;
  let activeRingTimeout = null;
  let activeVibrationInterval = null;
  let activeVibrationTimeout = null;
  let soundWasEnabled = false;
  let lastBellPlay = 0;
  const activeOscillators = new Set();

  async function enableSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    audioContext = audioContext || new AudioContext();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    playTone([660], 0.06, 0.03);
    soundWasEnabled = true;
    return true;
  }

  function enableSoundQuietly() {
    if (soundWasEnabled) return Promise.resolve(true);
    return enableSound().catch(() => false);
  }

  function playTone(frequencies, duration = 0.18, gap = 0.08, peakGain = 0.18, waveform = 'sine') {
    if (!audioContext || audioContext.state !== 'running') return false;

    const now = audioContext.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * (duration + gap);
      const end = start + duration;

      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      activeOscillators.add(oscillator);
      oscillator.addEventListener('ended', () => {
        activeOscillators.delete(oscillator);
      });
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    });

    return true;
  }

  function playChime(frequencies, options = {}) {
    if (!audioContext || audioContext.state !== 'running') return false;

    const duration = options.toneDuration || 0.32;
    const gap = options.gap || 0.08;
    const peakGain = options.peakGain || 0.38;
    const brightness = options.brightness || 0.7;
    const now = audioContext.currentTime;
    const compressor = audioContext.createDynamicsCompressor();
    const output = audioContext.createGain();

    compressor.threshold.setValueAtTime(-18, now);
    compressor.knee.setValueAtTime(16, now);
    compressor.ratio.setValueAtTime(4, now);
    compressor.attack.setValueAtTime(0.004, now);
    compressor.release.setValueAtTime(0.22, now);
    output.gain.setValueAtTime(0.9, now);
    compressor.connect(output);
    output.connect(audioContext.destination);

    frequencies.forEach((frequency, index) => {
      const start = now + index * (duration + gap);
      const end = start + duration;
      const partials = [
        { ratio: 1, level: 1, type: 'sine' },
        { ratio: 2, level: 0.2 * brightness, type: 'sine' },
        { ratio: 3.01, level: 0.06 * brightness, type: 'sine' }
      ];

      partials.forEach((partial) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const partialPeak = peakGain * partial.level;

        oscillator.type = partial.type;
        oscillator.frequency.setValueAtTime(frequency * partial.ratio * 1.012, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * partial.ratio, start + 0.035);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(partialPeak, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(partialPeak * 0.34, start + duration * 0.28);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(compressor);
        activeOscillators.add(oscillator);
        oscillator.addEventListener('ended', () => {
          activeOscillators.delete(oscillator);
        });
        oscillator.start(start);
        oscillator.stop(end + 0.03);
      });
    });

    return true;
  }

  async function playHappyBell() {
    const now = Date.now();
    if (now - lastBellPlay < 300) return;
    lastBellPlay = now;

    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {}
    }
    if (audioContext.state !== 'running') return;

    try {
      const response = await fetch('1%20sound/3%20happybell.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.warn('Could not play happybell sound:', error);
    }
  }

  function stopRingSequence() {
    if (activeRingInterval) {
      window.clearInterval(activeRingInterval);
      activeRingInterval = null;
    }

    if (activeRingTimeout) {
      window.clearTimeout(activeRingTimeout);
      activeRingTimeout = null;
    }

    if (activeVibrationInterval) {
      window.clearInterval(activeVibrationInterval);
      activeVibrationInterval = null;
    }

    if (activeVibrationTimeout) {
      window.clearTimeout(activeVibrationTimeout);
      activeVibrationTimeout = null;
    }

    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    for (const oscillator of activeOscillators) {
      try {
        oscillator.stop();
      } catch {}
    }

    activeOscillators.clear();
  }

  function playVibrationSequence(pattern, repeatForMs, intervalMs) {
    if (!navigator.vibrate) return false;

    navigator.vibrate(pattern);

    if (repeatForMs <= intervalMs) return true;

    activeVibrationInterval = window.setInterval(() => {
      navigator.vibrate(pattern);
    }, intervalMs);

    activeVibrationTimeout = window.setTimeout(() => {
      if (activeVibrationInterval) {
        window.clearInterval(activeVibrationInterval);
        activeVibrationInterval = null;
      }
      activeVibrationTimeout = null;
      navigator.vibrate(0);
    }, repeatForMs);

    return true;
  }

  function playRingSequence(frequencies, options = {}, onRepeat = () => {}) {
    const repeatForMs = options.repeatForMs || 0;
    const intervalMs = options.intervalMs || 3000;
    const vibrationIntervalMs = options.vibrationIntervalMs || intervalMs;
    const vibrationPattern = options.vibrationPattern || [180, 80, 180];

    stopRingSequence();
    const played = playChime(frequencies, options);
    playVibrationSequence(vibrationPattern, repeatForMs, vibrationIntervalMs);

    if (repeatForMs <= intervalMs) return played;

    activeRingInterval = window.setInterval(() => {
      playChime(frequencies, options);
      onRepeat();
    }, intervalMs);

    activeRingTimeout = window.setTimeout(stopRingSequence, repeatForMs);

    return played;
  }

  return {
    enableSound,
    enableSoundQuietly,
    playHappyBell,
    playRingSequence,
    stopRingSequence
  };
}
