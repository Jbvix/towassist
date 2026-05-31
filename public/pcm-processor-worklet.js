// AudioWorklet: converte o áudio do microfone (Float32) em PCM 16-bit
// e o envia para a thread principal. Roda fora da main thread (sem glitches).
// Ver docs/03-AGENTE-VOZ-KRATOS.md (regra obrigatória do guia xAI).

class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(int16, [int16.buffer]);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
