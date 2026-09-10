// Web Audio API Radio Engine with Low-Latency Streaming, Synthesis & DSP

export class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqArray: Uint8Array | null = null;

  // Background Lo-Fi music loop state
  private isMusicPlaying = false;
  private musicInterval: any = null;
  private currentChordIndex = 0;
  private bgMusicEnabled: boolean = true;
  private bgMusicBaseVolume: number = 0.28;

  // Panning nodes for realistic studio mics
  private jaxPanner: StereoPannerNode | null = null;
  private novaPanner: StereoPannerNode | null = null;

  // Speech utterance tracker
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted = false;
  private volume = 0.85;

  constructor() {
    // Initialized on user interaction
  }

  public async init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx({ sampleRate: 24000 });

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Studio Broadcast Compressor (adds that warm, thick "FM Radio" punch)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Visualizer Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Voice, Music, and SFX sub-buses
    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime); // ducked by default during talk

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Panners
    if (this.ctx.createStereoPanner) {
      this.jaxPanner = this.ctx.createStereoPanner();
      this.jaxPanner.pan.setValueAtTime(0.25, this.ctx.currentTime); // Jax slightly right

      this.novaPanner = this.ctx.createStereoPanner();
      this.novaPanner.pan.setValueAtTime(-0.25, this.ctx.currentTime); // Nova slightly left

      this.voiceGain.connect(this.compressor);
    } else {
      this.voiceGain.connect(this.compressor);
    }

    this.musicGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);

    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (muted) {
      window.speechSynthesis?.cancel();
    }
  }

  // --- Ducking Control & Background Music Toggle ---
  public setBackgroundMusicEnabled(enabled: boolean) {
    this.bgMusicEnabled = enabled;
    if (!this.musicGain || !this.ctx) return;
    if (!enabled) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    } else {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.duckMusic(true);
      if (!this.isMusicPlaying) {
        this.startMusicBed();
      }
    }
  }

  public isBackgroundMusicActive(): boolean {
    return this.bgMusicEnabled && this.isMusicPlaying;
  }

  public duckMusic(duck: boolean) {
    if (!this.musicGain || !this.ctx) return;
    if (!this.bgMusicEnabled) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    // When duck is true (RJ speaking), keep background music clearly audible as a rich radio bed (~0.28)
    // When duck is false (music solo break), swell up to full volume (~0.55)
    const target = duck ? this.bgMusicBaseVolume : 0.55;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.5);
  }

  // --- Background Lo-Fi Radio Bed (Procedural Synth with Bengaluru / South Indian Lo-Fi Mohanam Harmonies) ---
  public async startMusicBed() {
    if (this.isMusicPlaying && this.musicInterval) return;
    this.isMusicPlaying = true;

    // Ensure audio context is ready and active
    if (!this.ctx) {
      await this.init();
    } else if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        // user gesture will resume
      }
    }

    if (this.musicGain && this.ctx) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(this.bgMusicBaseVolume, this.ctx.currentTime);
    }

    // Chords progression: Mohanam/Pentatonic Indian Lo-Fi fusion
    // Sa-Ri-Ga-Pa-Dha (C-D-E-G-A) warm uplifting resonance
    const chords = [
      [130.81, 196.0, 261.63, 329.63, 392.0], // C3, G3, C4, E4, G4 (Mohanam Root)
      [146.83, 220.0, 261.63, 329.63, 440.0], // D3, A3, C4, E4, A4 (Indiranagar Twilight)
      [164.81, 196.0, 246.94, 329.63, 392.0], // E3, G3, B3, E4, G4 (Filter Coffee Morning)
      [110.0, 164.81, 220.0, 261.63, 329.63], // A2, E3, A3, C4, E4 (Cubbon Park Breeze)
    ];

    const playChord = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const chord = chords[this.currentChordIndex % chords.length];
      this.currentChordIndex++;
      const now = this.ctx.currentTime;
      const duration = 3.6;

      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const chordFilter = this.ctx!.createBiquadFilter();
        const chordGain = this.ctx!.createGain();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        chordFilter.type = 'lowpass';
        chordFilter.frequency.setValueAtTime(750 + Math.sin(now) * 180, now);

        chordGain.gain.setValueAtTime(0.001, now);
        chordGain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.5);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(chordFilter);
        chordFilter.connect(chordGain);
        chordGain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + duration);
      });

      // Warm acoustic bass line
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, now);
      bassGain.gain.setValueAtTime(0.24, now);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 1.4);

      // Mridangam / gentle percussion beat tap
      try {
        const tapOsc = this.ctx.createOscillator();
        const tapGain = this.ctx.createGain();
        tapOsc.type = 'triangle';
        tapOsc.frequency.setValueAtTime(280, now + 1.8);
        tapOsc.frequency.exponentialRampToValueAtTime(110, now + 1.95);
        tapGain.gain.setValueAtTime(0.001, now + 1.8);
        tapGain.gain.linearRampToValueAtTime(0.14, now + 1.82);
        tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        tapOsc.connect(tapGain);
        tapGain.connect(this.musicGain);
        tapOsc.start(now + 1.8);
        tapOsc.stop(now + 2.0);
      } catch (e) {
        // Ignore optional audio node errors
      }
    };

    playChord();
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = setInterval(playChord, 3600);
  }

  public stopMusicBed() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // --- Sound Effects Generator ---
  public playSoundEffect(effectName: string) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    switch (effectName.toLowerCase()) {
      case 'airhorn': {
        // Classic Reggae / Hip-Hop DJ Airhorn
        const frequencies = [466.16, 466.16, 622.25, 466.16];
        const times = [0, 0.12, 0.24, 0.42];
        frequencies.forEach((f, i) => {
          const osc1 = this.ctx!.createOscillator();
          const osc2 = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(f, now + times[i]);
          osc2.frequency.setValueAtTime(f * 1.01, now + times[i]);

          g.gain.setValueAtTime(0.001, now + times[i]);
          g.gain.linearRampToValueAtTime(0.12, now + times[i] + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + times[i] + 0.14);

          osc1.connect(g);
          osc2.connect(g);
          g.connect(this.sfxGain!);

          osc1.start(now + times[i]);
          osc2.start(now + times[i]);
          osc1.stop(now + times[i] + 0.15);
          osc2.stop(now + times[i] + 0.15);
        });
        break;
      }

      case 'rimshot':
      case 'badumtss': {
        // Snare 1
        this.createDrumHit(now, 220, 0.1, 0.1);
        // Snare 2
        this.createDrumHit(now + 0.16, 260, 0.1, 0.12);
        // Crash cymbal
        this.createCymbal(now + 0.35, 0.8);
        break;
      }

      case 'jingle':
      case 'chime': {
        // Radio station chime
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);

          g.gain.setValueAtTime(0.001, now + idx * 0.1);
          g.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.8);

          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.85);
        });
        break;
      }

      case 'static':
      case 'tuning': {
        // FM radio tuning static sweep
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.3);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
        filter.Q.setValueAtTime(6, now);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        noise.connect(filter);
        filter.connect(g);
        g.connect(this.sfxGain!);

        noise.start(now);
        noise.stop(now + 0.6);
        break;
      }

      case 'applause':
      case 'cheer': {
        // Filtered crowd applause burst
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i * 0.005));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(1.2, now);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        noise.connect(filter);
        filter.connect(g);
        g.connect(this.sfxGain!);

        noise.start(now);
        noise.stop(now + 1.5);
        break;
      }

      case 'scratch': {
        // DJ vinyl record scratch
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.1);
        osc.frequency.linearRampToValueAtTime(120, now + 0.22);

        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'bleep': {
        // Censor bleep
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        g.gain.setValueAtTime(0.12, now);
        g.gain.setValueAtTime(0.12, now + 0.35);
        g.gain.linearRampToValueAtTime(0.001, now + 0.38);

        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      default:
        break;
    }
  }

  private createDrumHit(time: number, freq: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + duration);

    g.gain.setValueAtTime(gainVal, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  private createCymbal(time: number, duration: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  // --- PCM Audio Playback (From Gemini TTS) ---
  public async playGeminiPCM(base64Pcm: string, sampleRate = 24000): Promise<void> {
    if (!this.ctx || !this.voiceGain) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian to Float32Array
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = this.ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.voiceGain);

      return new Promise((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    } catch (err) {
      console.warn('Failed to decode/play Gemini PCM, fallback to Web Speech:', err);
    }
  }

  // --- Expressive Web Speech API (Local Accents & Distinct RJ Personas) ---
  public async speakText(
    speaker: 'Jax' | 'Nova',
    text: string,
    accent: string,
    onWordBoundary?: (word: string) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        setTimeout(resolve, Math.max(1000, text.length * 50));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Select voices available on user's system matching regional accent
      const voices = window.speechSynthesis.getVoices();
      
      const isSouthIndian = accent.includes('South Indian') || accent.includes('Bengaluru') || accent.includes('India');

      let langCode = 'en-US';
      if (isSouthIndian) {
        langCode = 'en-IN';
      } else if (accent.includes('London') || accent.includes('British')) {
        langCode = 'en-GB';
      } else if (accent.includes('Aussie') || accent.includes('Australian')) {
        langCode = 'en-AU';
      } else if (accent.includes('Southern') || accent.includes('Brooklyn')) {
        langCode = 'en-US';
      }

      utterance.lang = langCode;

      // Detect Indian English voices (Google en-IN, Microsoft Ravi/Heera/Prabhat, Rishi, Veena, Neerja, etc.)
      const indianVoices = voices.filter(v => 
        v.lang === 'en-IN' ||
        v.lang.startsWith('en-IN') ||
        v.lang.replace('_', '-').includes('en-IN') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('rishi') ||
        v.name.toLowerCase().includes('veena') ||
        v.name.toLowerCase().includes('neerja') ||
        v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('kavya') ||
        v.name.toLowerCase().includes('prabhat') ||
        v.name.toLowerCase().includes('ravi')
      );

      const accentVoices = (isSouthIndian && indianVoices.length > 0)
        ? indianVoices
        : voices.filter(v => v.lang.startsWith(langCode.substring(0, 2)));

      if (speaker === 'Jax') {
        // Jax persona: Fast-paced, punchy, energetic South Indian RJ tempo
        utterance.pitch = isSouthIndian ? 1.15 : 1.25;
        utterance.rate = isSouthIndian ? 1.04 : 1.12;
        // Try finding a male Indian or energetic voice
        const jaxVoice = accentVoices.find(v => 
          v.name.includes('Male') || v.name.includes('Rishi') || v.name.includes('Ravi') || v.name.includes('David') || v.name.includes('Alex')
        ) || accentVoices[0];
        if (jaxVoice) utterance.voice = jaxVoice;
      } else {
        // Nova persona: Warm, smooth, melodic, measured South Indian radio host
        utterance.pitch = isSouthIndian ? 0.94 : 0.85;
        utterance.rate = isSouthIndian ? 0.96 : 0.95;
        // Try finding a smooth female Indian or mellow voice
        const novaVoice = accentVoices.find(v => 
          v.name.includes('Female') || v.name.includes('Veena') || v.name.includes('Heera') || v.name.includes('Neerja') || v.name.includes('Kavya') || v.name.includes('Samantha') || v.name.includes('Victoria')
        ) || (accentVoices.length > 1 ? accentVoices[1] : accentVoices[0]);
        if (novaVoice) utterance.voice = novaVoice;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word' && onWordBoundary) {
          const word = text.substring(event.charIndex, event.charIndex + (event.charLength || 6));
          onWordBoundary(word);
        }
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        this.currentUtterance = null;
        resolve();
      };

      // Workaround for Chrome speech synthesis timeout bug on long texts
      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Real-time Visualizer Data ---
  public getVisualizerData(): { frequencyData: number[]; vuLeft: number; vuRight: number } {
    if (!this.analyser || !this.freqArray) {
      return { frequencyData: new Array(24).fill(2), vuLeft: 0, vuRight: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqArray);
    const bins = 24;
    const step = Math.floor(this.freqArray.length / bins);
    const frequencyData: number[] = [];

    let sum = 0;
    for (let i = 0; i < bins; i++) {
      let binSum = 0;
      for (let j = 0; j < step; j++) {
        binSum += this.freqArray[i * step + j] || 0;
      }
      const val = binSum / step;
      frequencyData.push(val);
      sum += val;
    }

    const avg = sum / bins;
    const vuLeft = Math.min(100, Math.round((avg / 255) * 120 * (0.9 + Math.sin(Date.now() * 0.01) * 0.1)));
    const vuRight = Math.min(100, Math.round((avg / 255) * 115 * (0.9 + Math.cos(Date.now() * 0.01) * 0.1)));

    return { frequencyData, vuLeft, vuRight };
  }

  public close() {
    this.stopMusicBed();
    this.stopSpeaking();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}

// Global audio engine singleton
export const audioEngine = new RadioAudioEngine();
