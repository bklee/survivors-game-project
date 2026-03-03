import wave
import math
import struct
import os

os.makedirs('public/assets/audio', exist_ok=True)

def generate_tone(frequency, duration, sample_rate=44100, wave_type='square'):
    data = []
    num_samples = int(sample_rate * duration)
    for i in range(num_samples):
        t = float(i) / sample_rate
        if wave_type == 'square':
            val = 1.0 if math.sin(2 * math.pi * frequency * t) > 0 else -1.0
        elif wave_type == 'sawtooth':
            val = 2.0 * (t * frequency - math.floor(0.5 + t * frequency))
        elif wave_type == 'sine':
            val = math.sin(2 * math.pi * frequency * t)
        else:
            val = 0
        
        # Envelope: Attack and Decay
        envelope = 1.0
        attack_time = 0.05
        decay_time = 0.1
        if t < attack_time:
            envelope = t / attack_time
        elif t > duration - decay_time:
            envelope = (duration - t) / decay_time
        
        # Max volume reduction for sine vs square
        vol = 8000 if wave_type == 'square' or wave_type == 'sawtooth' else 15000
        data.append(int(val * envelope * vol))
    return data

def save_wav(filename, data, sample_rate=44100):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for s in data:
            f.writeframesraw(struct.pack('<h', s))

print("Generating select_bgm.wav...")
select_notes = [(261.63, 0.4), (329.63, 0.4), (392.00, 0.4), (523.25, 0.8), (392.00, 0.4), (329.63, 0.4)] * 4
select_data = []
for freq, dur in select_notes:
    select_data.extend(generate_tone(freq, dur, wave_type='sine'))
save_wav('public/assets/audio/select_bgm.wav', select_data)

print("Generating main_bgm.wav...")
main_notes = [(110.00, 0.3), (110.00, 0.3), (123.47, 0.3), (130.81, 0.3), (110.00, 0.3), (146.83, 0.3)] * 8
main_data = []
for freq, dur in main_notes:
    main_data.extend(generate_tone(freq, dur, wave_type='square'))
save_wav('public/assets/audio/main_bgm.wav', main_data)

print("Generating boss_bgm.wav...")
boss_notes = [(164.81, 0.15), (174.61, 0.15), (233.08, 0.15), (164.81, 0.15), (174.61, 0.15), (329.63, 0.15), (311.13, 0.2)] * 10
boss_data = []
for freq, dur in boss_notes:
    boss_data.extend(generate_tone(freq, dur, wave_type='sawtooth'))
save_wav('public/assets/audio/boss_bgm.wav', boss_data)

print("Done generating BGM files.")
