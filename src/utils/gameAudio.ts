// Self-contained Web Audio API synthesizer for Retro Arcade Sound Effects
let isMutedGlobal = false;

export const toggleGlobalMute = () => {
  isMutedGlobal = !isMutedGlobal;
  return isMutedGlobal;
};

export const getIsMutedGlobal = () => {
  return isMutedGlobal;
};

export const playSound = (type: 'win' | 'lose' | 'click' | 'powerup' | 'boss_hit' | 'boss_defeat') => {
  if (isMutedGlobal) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    
    if (type === 'win') {
      // Elegant anime chime ascending Arpeggio
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.1); // A5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.25); // E6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'lose') {
      // Disappointing descend buzzer 
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(110, now + 0.35); // A2
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'click') {
      // Subtle neat tactile pop
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'powerup') {
      // Cyber ascent sparkly sound
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.35);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'boss_hit') {
      // Epic deep sword slash impact
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.2);
      
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'boss_defeat') {
      // Glorious fantasy triumph melody
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major Arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        noteGain.gain.setValueAtTime(0.06, now + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    }
  } catch (e) {
    // Fail silently is standard behavior for browser auto-play policies
    console.debug('Audio playback delayed or blocked by browser gesture lock.');
  }
};
