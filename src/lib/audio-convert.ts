/// <reference path="../../node_modules/@breezystack/lamejs/type.d.ts" />
// Browser-only: turns any recording the browser can read (MP3, M4A/AAC, WAV, OGG, OPUS, FLAC, WEBM, MP4…)
// into light mono 16 kHz MP3 pieces (32 kb/s ≈ 14 MB an hour, plenty for speech), cut every
// AUDIO_CHUNK_MINUTES. The encoder (lamejs) is loaded only when a recording is converted.
import { AUDIO_CHUNK_MINUTES, AUDIO_MAX_MINUTES } from "@/lib/text-tools";

const RATE = 16_000;
const KBPS = 32;
/** Largest file accepted before decoding (the browser holds it in memory). */
export const AUDIO_MAX_FILE_MB = 300;

export class AudioConvertError extends Error {
  constructor(public code: "too_big" | "unreadable" | "too_long" | "empty") { super(code); }
}

/** Reads the file and returns its decoded mono samples at 16 kHz and its length in seconds. */
export async function decodeRecording(file: File): Promise<{ samples: Float32Array; seconds: number }> {
  if (file.size > AUDIO_MAX_FILE_MB * 1024 * 1024) throw new AudioConvertError("too_big");
  const data = await file.arrayBuffer();
  let decoded: AudioBuffer;
  try {
    // An offline context at 16 kHz resamples while decoding (no playback, no permission needed).
    decoded = await new OfflineAudioContext(1, 1, RATE).decodeAudioData(data);
  } catch {
    throw new AudioConvertError("unreadable");
  }
  if (decoded.duration > AUDIO_MAX_MINUTES * 60 + 30) throw new AudioConvertError("too_long");
  if (decoded.duration < 1) throw new AudioConvertError("empty");
  const samples = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < ch.length; i++) samples[i]! += ch[i]! / decoded.numberOfChannels;
  }
  return { samples, seconds: decoded.duration };
}

/** Encodes the samples into MP3 pieces; `onProgress` receives 0 → 1. Yields to the page between blocks. */
export async function encodePieces(samples: Float32Array, onProgress: (p: number) => void): Promise<Blob[]> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const perPiece = AUDIO_CHUNK_MINUTES * 60 * RATE;
  const pieces: Blob[] = [];
  const block = 1152 * 40;
  for (let start = 0; start < samples.length; start += perPiece) {
    const end = Math.min(samples.length, start + perPiece);
    const encoder = new Mp3Encoder(1, RATE, KBPS);
    const parts: Uint8Array[] = [];
    for (let i = start; i < end; i += block) {
      const slice = samples.subarray(i, Math.min(end, i + block));
      const pcm = new Int16Array(slice.length);
      for (let k = 0; k < slice.length; k++) { const s = Math.max(-1, Math.min(1, slice[k]!)); pcm[k] = s < 0 ? s * 0x8000 : s * 0x7fff; }
      const out = encoder.encodeBuffer(pcm);
      if (out.length) parts.push(new Uint8Array(out));
      if (((i - start) / block) % 25 === 0) { onProgress(i / samples.length); await new Promise((r) => setTimeout(r, 0)); }
    }
    const tail = encoder.flush();
    if (tail.length) parts.push(new Uint8Array(tail));
    pieces.push(new Blob(parts as BlobPart[], { type: "audio/mpeg" }));
  }
  onProgress(1);
  return pieces;
}
