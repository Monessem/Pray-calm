#!/usr/bin/env python3
"""Generate the notification chime (soft two-tone bell) as OGG Vorbis.

A 16-bit mono WAV is synthesized with numpy-free pure-Python math, then
encoded by ffmpeg to assets/audio/chime.ogg (~10x smaller than WAV).
"""
import math
import subprocess
import wave

RATE = 22050
DURATION = 1.2
OUT_WAV = "/tmp/tcalm-chime.wav"
OUT_OGG = "/home/z/my-project/tcalm-firefox/assets/audio/chime.ogg"

def envelope(t: float) -> float:
    # Fast attack, exponential decay.
    attack = min(1.0, t / 0.01)
    return attack * math.exp(-t / 0.35)

def tone(t: float, freq: float) -> float:
    return math.sin(2 * math.pi * freq * t) * envelope(t)

def sample(t: float) -> int:
    if t < 0.6:
        value = 0.55 * tone(t, 880.0) + 0.45 * tone(t, 1318.5)  # E6 + ~E major color
    else:
        value = 0.55 * tone(t - 0.6, 659.3) + 0.45 * tone(t - 0.6, 987.8)  # E5/B5
    return max(-1.0, min(1.0, value)) * 0.55

def main():
    frames = bytearray()
    n = int(RATE * DURATION)
    for i in range(n):
        t = i / RATE
        value = int(sample(t) * 32767)
        frames += value.to_bytes(2, byteorder="little", signed=True)

    with wave.open(OUT_WAV, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(bytes(frames))

    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", OUT_WAV, "-c:a", "libvorbis", "-qscale:a", "3", OUT_OGG],
        check=True,
    )
    print(f"wrote {OUT_OGG}")

if __name__ == "__main__":
    main()
