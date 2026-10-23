# Trilha leve de piano para o stories (feita aqui, sem direitos autorais) + "clique" nos toques.
# Uso: python trilha.py <duracao_s> <toques.json> <saida.wav>
import json, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve

SR = 44100
dur = float(sys.argv[1])
taps = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else []
out = sys.argv[3] if len(sys.argv) > 3 else "trilha.wav"
rng = np.random.default_rng(7)

BPM = 104
beat = 60 / BPM
n = int(SR * (dur + 1))
mix = np.zeros(n)

def note_freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

def piano(midi, length, vel=0.5):
    t = np.arange(int(SR * length)) / SR
    f = note_freq(midi)
    # alguns harmônicos com quedas diferentes (som de piano/teclado macio)
    wave = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2)
            + 0.45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3.5)
            + 0.18 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5.0)
            + 0.08 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 7.0))
    attack = np.minimum(1, t / 0.006)
    return vel * wave * attack

def add(sig, at):
    i = int(at * SR)
    if i >= n:
        return
    end = min(n, i + len(sig))
    mix[i:end] += sig[: end - i]

# Dó maior, I–V–vi–IV (C G Am F), arpejo em colcheias + baixo + melodia simples
chords = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]]
melody = [[76, None, 74, 72, None, 74, 76, None], [74, None, 71, 74, None, 79, 78, None],
          [76, None, 72, 76, None, 79, 76, None], [72, None, 74, 72, None, 69, 72, None]]
bar = beat * 4
t = 0.6
bar_i = 0
while t < dur:
    ch = chords[bar_i % 4]
    add(piano(ch[0] - 12, bar * 1.1, 0.42), t)          # baixo
    add(piano(ch[0], bar * 1.1, 0.16), t)
    pattern = [1, 2, 3, 4, 3, 2, 3, 4]
    for k, idx in enumerate(pattern):                    # arpejo
        add(piano(ch[idx], beat * 1.6, 0.13), t + k * beat / 2)
    if bar_i >= 1:                                       # melodia entra no 2º compasso
        for k, m in enumerate(melody[bar_i % 4]):
            if m is not None:
                add(piano(m, beat * 1.4, 0.2), t + k * beat / 2)
    t += bar
    bar_i += 1

# reverberação curta (sala pequena)
ir_len = int(SR * 1.2)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 4.5) * 0.12
ir[0] = 1.0
mix = fftconvolve(mix, ir)[:n]

# "clique" suave em cada toque da mãozinha
for at in taps:
    tt = np.arange(int(SR * 0.09)) / SR
    pop = np.sin(2 * np.pi * (1400 - 6000 * tt) * tt) * np.exp(-tt * 55) * 0.35
    add(pop, at)

mix = mix[: int(SR * dur)]
# entrada e saída suaves
fade_in = int(SR * 0.5); fade_out = int(SR * 1.6)
mix[:fade_in] *= np.linspace(0, 1, fade_in)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.8
stereo = np.stack([mix, mix], axis=1)
wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
print("trilha:", out, f"{dur:.1f}s, toques: {len(taps)}")
