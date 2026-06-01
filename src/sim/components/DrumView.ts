// Visualização do tambor + cabo, reagindo à tensão da linha e ao comando.
// Desenho procedural (PixiJS): o tambor gira conforme o sentido da alavanca
// (recolher/soltar) e o cabo muda de cor/espessura conforme a tensão/carga.

import { Container, Graphics } from 'pixi.js';

export class DrumView {
  readonly container = new Container();
  private readonly drum = new Graphics();
  private readonly rope = new Graphics();
  private accent: number;

  private angle = 0; // rotação acumulada do tambor (rad)
  private tension = 0; // 0..1
  private direction = 0; // -1 soltar, 0 neutro, 1 recolher

  constructor(accent: number) {
    this.accent = accent;
    this.container.addChild(this.rope, this.drum);
  }

  setAccent(accent: number): void {
    this.accent = accent;
  }

  /** Atualiza a partir do estado do painel. */
  update(tension: number, direction: number): void {
    this.tension = Math.max(0, Math.min(1, tension));
    this.direction = direction;
  }

  /** Avança a animação (chamado pelo ticker). */
  tick(deltaSec: number): void {
    // Velocidade de rotação proporcional ao sentido; sem comando, fica parado.
    const speed = this.direction * 2.2; // rad/s
    this.angle += speed * deltaSec;
    this.redraw();
  }

  private redraw(): void {
    const R = 46;
    const cx = 0;
    const cy = 0;

    // ---- Tambor ----
    this.drum.clear();
    // corpo
    this.drum.circle(cx, cy, R).fill(0x1c2530).stroke({ width: 3, color: 0x35424f });
    this.drum.circle(cx, cy, R - 8).stroke({ width: 1.5, color: 0x2a3542 });
    // raios (mostram a rotação)
    for (let i = 0; i < 6; i++) {
      const a = this.angle + (Math.PI / 3) * i;
      this.drum
        .moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10)
        .lineTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10))
        .stroke({ width: 2, color: 0x3a4654 });
    }
    // cubo central
    this.drum.circle(cx, cy, 9).fill(this.accent).stroke({ width: 2, color: 0xe7edf3 });

    // ---- Cabo ----
    // Cor: verde (folga) → âmbar → vermelho (alta tensão). Espessura cresce com a tensão.
    const t = this.tension;
    const color = t >= 0.8 ? 0xd8503f : t >= 0.5 ? 0xd6a23a : 0x3fb37a;
    const thickness = 2 + t * 4;
    // Catenária simples: o cabo sai do topo do tambor para a direita; quanto
    // menor a tensão, mais "barriga" (afunda no meio).
    const x0 = cx + R;
    const y0 = cy - 4;
    const x1 = cx + R + 150;
    const y1 = cy - 4;
    const sag = (1 - t) * 34; // folga
    this.rope.clear();
    this.rope.moveTo(x0, y0);
    this.rope.quadraticCurveTo((x0 + x1) / 2, y0 + sag, x1, y1).stroke({
      width: thickness,
      color,
    });
    // ponto de ancoragem (ex.: cabeço/defensa)
    this.rope.circle(x1, y1, 5).fill(0x35424f).stroke({ width: 2, color: 0x9fb0c0 });
  }
}
