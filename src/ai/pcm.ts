// Helpers de áudio PCM 24 kHz para a xAI Realtime Voice.

/** Codifica Int16Array em base64 sem estourar a pilha (blocos de 8 KiB). */
export function audioToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(
    int16Array.buffer,
    int16Array.byteOffset,
    int16Array.byteLength,
  );
  const CHUNK = 0x2000; // 8 KiB
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(''));
}

/** Decodifica base64 (PCM 16-bit) em Float32Array para playback. */
export function base64ToFloat32(base64: string): Float32Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}
