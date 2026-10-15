/**
 * Utilitários de áudio usando a Web Audio API nativa dos navegadores.
 * Funciona sem dependências externas, sem arquivos MP3 na rede e com compatibilidade cross-browser.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Desbloqueia o AudioContext na primeira interação do usuário (clique, toque ou tecla),
 * garantindo que eventos assíncronos (como Realtime WebSocket) consigam reproduzir sons.
 */
export function initAudioUnlock() {
  if (typeof window === "undefined") return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("click", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

/**
 * Emite um som suave de notificação geral (usado no Chat).
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primeiro tom (D5 - 587 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Segundo tom harmônico mais agudo (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch {
    // Silencia restrições de autoplay se ainda não houve interação
  }
}

/**
 * Alerta sonoro exclusivo e chamativo para novas propostas de reserva (Recepção / Concierge Chime).
 * Toca uma sequência melódica ascendente (C5 -> E5 -> G5 -> C6) com harmônicos brilhantes,
 * chamando a atenção do anfitrião/administrador sem ser estridente.
 */
export function playReservationAlert(force = false) {
  if (typeof window === "undefined") return;

  try {
    if (!force) {
      const soundEnabled = localStorage.getItem("cp_admin_sound_enabled");
      if (soundEnabled === "false") return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Arpejo de sino de hotel (C5 -> E5 -> G5 -> C6 com ressonância estendida)
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.28, gain: 0.22 }, // Dó 5
      { freq: 659.25, start: 0.12, dur: 0.28, gain: 0.25 }, // Mi 5
      { freq: 783.99, start: 0.24, dur: 0.35, gain: 0.28 }, // Sol 5
      { freq: 1046.5, start: 0.38, dur: 0.75, gain: 0.35 }, // Dó 6 (ressonante)
    ];

    notes.forEach(({ freq, start, dur, gain }) => {
      const startTime = now + start;
      const stopTime = startTime + dur;

      // Oscilador de onda senoidal suave
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Oscilador harmônico (triangular) para dar riqueza e brilho acústico
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      // Envelope da fundamental
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      // Envelope do harmônico
      gainHarmonic.gain.setValueAtTime(0, startTime);
      gainHarmonic.gain.linearRampToValueAtTime(gain * 0.22, startTime + 0.015);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);
      oscHarmonic.start(startTime);
      oscHarmonic.stop(stopTime);
    });
  } catch (err) {
    console.warn("[Sound] Erro ao reproduzir som de reserva:", err);
  }
}

/**
 * Efeito sonoro suave de confirmação para o hóspede/cliente após solicitar uma reserva.
 */
export function playSuccessChime() {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dois tons ascendentes suaves (F#5 -> B5)
    const tones = [
      { freq: 739.99, start: 0.0, dur: 0.22, gain: 0.15 },
      { freq: 987.77, start: 0.1, dur: 0.45, gain: 0.18 },
    ];

    tones.forEach(({ freq, start, dur, gain }) => {
      const startTime = now + start;
      const stopTime = startTime + dur;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);
    });
  } catch {
    // Silencia se navegador bloquear
  }
}
