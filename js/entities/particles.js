/**
 * particles.js
 * ---------------------------------------------------------------
 * Sistema de particulas muy ligero: chispas de impacto, fogonazos,
 * numeros de dano flotantes y astillas. Todo se guarda en un solo
 * array y se recicla; no hay objetos por frame.
 */

export class Particles {
  constructor(max = 400) {
    this.list = [];
    this.max = max;
  }

  clear() { this.list.length = 0; }

  _push(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push(p);
  }

  /** Chispas al impactar una bala. */
  spark(x, y, color, count = 6, speed = 220) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.9);
      this._push({
        type: 'spark',
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.22 + Math.random() * 0.25,
        maxLife: 0.5,
        size: 1.6 + Math.random() * 2.2,
        color,
        gravity: 900,
      });
    }
  }

  /** Fogonazo en la boca del canon. */
  muzzleFlash(x, y, angle, color, size = 1) {
    this._push({
      type: 'flash',
      x, y, angle, color,
      life: 0.06,
      maxLife: 0.06,
      size,
    });
  }

  /** Numero de dano que sube y se desvanece. */
  damageNumber(x, y, amount, color) {
    this._push({
      type: 'damage',
      x: x + (Math.random() - 0.5) * 14,
      y,
      vy: -70,
      life: 0.85,
      maxLife: 0.85,
      text: String(amount),
      color,
    });
  }

  /** Humo/polvo (curas, pasos, roturas). */
  puff(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      this._push({
        type: 'puff',
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 4 + Math.random() * 6,
        color,
        gravity: -30,
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }

      if (p.vx !== undefined) p.x += p.vx * dt;
      if (p.vy !== undefined) p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = t;

      switch (p.type) {
        case 'spark':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'flash': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(20 * p.size, -7 * p.size);
          ctx.lineTo(30 * p.size, 0);
          ctx.lineTo(20 * p.size, 7 * p.size);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(6 * p.size, 0, 4 * p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'damage':
          ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          break;

        case 'puff':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
