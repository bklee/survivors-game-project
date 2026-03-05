#!/usr/bin/env python3
"""Generate simple SFX sounds for the game"""
import wave, struct, math, os, subprocess

OUTDIR = './public/assets/audio'
os.makedirs(OUTDIR, exist_ok=True)

SAMPLE_RATE = 44100

def save_wav(filename, frames, sample_rate=SAMPLE_RATE):
    with wave.open(filename, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join([struct.pack('<h', f) for f in frames]))

def to_mp3(wav_path, mp3_path):
    subprocess.run(['ffmpeg', '-y', '-i', wav_path, '-q:a', '5', mp3_path], 
                   capture_output=True)
    os.remove(wav_path)

def gen_frames(freq_func, duration, volume=0.5):
    n = int(SAMPLE_RATE * duration)
    frames = []
    for i in range(n):
        t = i / SAMPLE_RATE
        fade = min(1.0, (n - i) / (SAMPLE_RATE * 0.05))  # 50ms fade out
        amp = int(32767 * volume * fade * freq_func(t))
        frames.append(max(-32767, min(32767, amp)))
    return frames

# fire_cast: rising whoosh 200->800Hz
frames = gen_frames(lambda t: math.sin(2 * math.pi * (200 + 600 * t / 0.3) * t), 0.3)
save_wav('/tmp/fire_cast.wav', frames)
to_mp3('/tmp/fire_cast.wav', f'{OUTDIR}/fire_cast.mp3')
print("Generated fire_cast.mp3")

# ice_cast: descending crystalline 600->200Hz
frames = gen_frames(lambda t: math.sin(2 * math.pi * (600 - 400 * t / 0.25) * t), 0.25)
save_wav('/tmp/ice_cast.wav', frames)
to_mp3('/tmp/ice_cast.wav', f'{OUTDIR}/ice_cast.mp3')
print("Generated ice_cast.mp3")

# poison_cast: bubbly low 150Hz with wobble
frames = gen_frames(lambda t: math.sin(2 * math.pi * (150 + 30 * math.sin(20 * t)) * t), 0.35)
save_wav('/tmp/poison_cast.wav', frames)
to_mp3('/tmp/poison_cast.wav', f'{OUTDIR}/poison_cast.mp3')
print("Generated poison_cast.mp3")

# hit: short sharp thud 100Hz
frames = gen_frames(lambda t: math.sin(2 * math.pi * 100 * t) * math.exp(-10 * t), 0.15, volume=0.8)
save_wav('/tmp/hit.wav', frames)
to_mp3('/tmp/hit.wav', f'{OUTDIR}/hit.mp3')
print("Generated hit.mp3")

# level_up: ascending arpeggio C-E-G-C 
def level_up_func(t):
    notes = [261.6, 329.6, 392.0, 523.3]
    step = 0.08
    idx = min(int(t / step), len(notes) - 1)
    return math.sin(2 * math.pi * notes[idx] * t)
frames = gen_frames(level_up_func, 0.35, volume=0.6)
save_wav('/tmp/level_up.wav', frames)
to_mp3('/tmp/level_up.wav', f'{OUTDIR}/level_up.mp3')
print("Generated level_up.mp3")

print("All SFX generated!")
