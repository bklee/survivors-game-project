import wave
import math
import struct
import os

os.makedirs('public/assets/audio', exist_ok=True)
SAMPLE_RATE = 44100

def note_freq(note_str):
    notes = {'C':-9, 'C#':-8, 'D':-7, 'D#':-6, 'E':-5, 'F':-4, 'F#':-3, 'G':-2, 'G#':-1, 'A':0, 'A#':1, 'B':2}
    name = note_str[:-1]
    octave = int(note_str[-1])
    n = notes[name] + (octave - 4) * 12
    return 440.0 * (2.0 ** (n / 12.0))

def generate_track(notes, total_duration, wave_type='sine', vol_mult=1.0, attack=0.1, decay=0.1, sustain=0.8, release=0.1):
    track_samples = [0] * int(SAMPLE_RATE * total_duration)
    for start, end, freq in notes:
        start_idx = int(start * SAMPLE_RATE)
        end_idx = int(end * SAMPLE_RATE)
        duration = end - start
        
        for i in range(end_idx - start_idx):
            if start_idx + i >= len(track_samples):
                break
            t = float(i) / SAMPLE_RATE
            
            if wave_type == 'square':
                val = 1.0 if math.sin(2 * math.pi * freq * t) > 0 else -1.0
            elif wave_type == 'sawtooth':
                val = 2.0 * (t * freq - math.floor(0.5 + t * freq))
            elif wave_type == 'triangle':
                val = 2.0 * abs(2.0 * (t * freq - math.floor(t * freq + 0.5))) - 1.0
            else: # sine
                val = math.sin(2 * math.pi * freq * t)
                
            env = 1.0
            if t < attack:
                env = t / attack
            elif t < attack + decay:
                env = 1.0 - (1.0 - sustain) * ((t - attack) / decay)
            elif t > duration - release:
                env = sustain * (duration - t) / release
            else:
                env = sustain
                
            track_samples[start_idx + i] += val * env * vol_mult
    return track_samples

def save_wav(filename, tracks, duration):
    print(f"Generating {filename}...")
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        
        mixed = []
        num_samples = int(SAMPLE_RATE * duration)
        for i in range(num_samples):
            s = 0
            for t in tracks:
                if i < len(t):
                    s += t[i]
            # soft clipping
            s = max(-1.0, min(1.0, s))
            mixed.append(int(s * 15000)) # scaling volume output
            
        for s in mixed:
            f.writeframesraw(struct.pack('<h', s))

def make_select_bgm(): # Zelda fairy fountain style
    duration = 16.0
    melody_notes = []
    chord_notes = []
    
    chords = [
        ('C4', 'E4', 'G4', 'C5'),
        ('A3', 'C4', 'E4', 'A4'),
        ('F3', 'A3', 'C4', 'F4'),
        ('G3', 'B3', 'D4', 'G4')
    ]
    
    time = 0.0
    for i in range(4):
        for chord in chords:
            for j, note in enumerate(chord):
                melody_notes.append((time + j*0.2, time + j*0.2 + 0.8, note_freq(note)))
            for note in chord[:3]:
                chord_notes.append((time, time + 2.0, note_freq(note)))
            time += 2.0
            
    tracks = [
        generate_track(melody_notes, duration, 'triangle', vol_mult=0.4, attack=0.05, release=0.4),
        generate_track(chord_notes, duration, 'sine', vol_mult=0.2, attack=0.5, release=0.5)
    ]
    save_wav('public/assets/audio/select_bgm.wav', tracks, duration)

def make_main_bgm(): # Orchestral march / Fantasy Overworld
    duration = 16.0
    melody_notes = []
    bass_notes = []
    
    # Heroic melody
    m_sequence = [
        ('C5', 0.5), ('G4', 0.5), ('C5', 0.25), ('D5', 0.25), ('E5', 0.25), ('F5', 0.25), 
        ('G5', 1.0), ('E5', 1.0),
        ('A5', 0.5), ('A5', 0.25), ('B5', 0.25), ('C6', 1.0), ('G5', 1.0),
        ('F5', 0.5), ('E5', 0.5), ('D5', 1.0), ('G4', 1.0)
    ]
    
    b_sequence = [
        ('C3', 1.0), ('E3', 1.0), ('C3', 1.0), ('G3', 1.0),
        ('F3', 1.0), ('A3', 1.0), ('G3', 1.0), ('D3', 1.0)
    ]
    
    time = 0.0
    for note, dur in m_sequence:
        melody_notes.append((time, time + dur*0.9, note_freq(note)))
        time += dur
    
    time = 0.0
    for note, dur in m_sequence:
        melody_notes.append((time + 8.0, time + 8.0 + dur*0.9, note_freq(note)))
        time += dur
        
    time = 0.0
    for i in range(2):
        for note, dur in b_sequence:
            bass_notes.append((time, time + dur, note_freq(note)))
            time += dur
            
    tracks = [
        generate_track(melody_notes, duration, 'square', vol_mult=0.15, attack=0.05, release=0.1), # Brass imitation
        generate_track(bass_notes, duration, 'sawtooth', vol_mult=0.15, attack=0.1, release=0.2) # Strings imitation
    ]
    save_wav('public/assets/audio/main_bgm.wav', tracks, duration)

def make_boss_bgm(): # Fast tense strings and low brass
    duration = 16.0
    melody_notes = []
    bass_notes = []
    
    time = 0.0
    for idx in range(16):
        base_note = 'D3' if idx % 2 == 0 else 'A2'
        bass_notes.append((time, time+0.5, note_freq(base_note)))
        bass_notes.append((time+0.5, time+1.0, note_freq('D3')))
        time += 1.0
        
    m_sequence = [
        ('D5', 0.25), ('A4', 0.25), ('F5', 0.25), ('D5', 0.25), 
        ('E5', 0.25), ('C5', 0.25), ('G4', 0.25), ('C5', 0.25),
        ('D5', 0.5), ('F5', 0.5), ('A5', 0.5), ('G5', 0.5)
    ]
    
    time = 0.0
    for i in range(8):
        for note, dur in m_sequence:
            melody_notes.append((time, time + dur*0.8, note_freq(note)))
            time += dur
        
    tracks = [
        generate_track(melody_notes, duration, 'sawtooth', vol_mult=0.1, attack=0.01, release=0.05), # frantic strings
        generate_track(bass_notes, duration, 'square', vol_mult=0.2, attack=0.05, release=0.2) # deep horns
    ]
    save_wav('public/assets/audio/boss_bgm.wav', tracks, duration)

make_select_bgm()
make_main_bgm()
make_boss_bgm()

print("Copied files to dist too if exists")
import shutil
if os.path.exists('dist/assets/audio'):
    shutil.copyfile('public/assets/audio/select_bgm.wav', 'dist/assets/audio/select_bgm.wav')
    shutil.copyfile('public/assets/audio/main_bgm.wav', 'dist/assets/audio/main_bgm.wav')
    shutil.copyfile('public/assets/audio/boss_bgm.wav', 'dist/assets/audio/boss_bgm.wav')

