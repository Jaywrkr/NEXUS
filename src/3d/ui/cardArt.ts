import { CARD_BY_ID, TYPES, type ChispiCard } from '../data/chispis';

/*
 * Dibujo de los Chispis y de las cartas en canvas 2D (sin imágenes). Cada tipo tiene su forma de cuerpo;
 * cada Chispi varía tono, ojos y detalles según su nombre, así no hay dos iguales.
 * `silhouette` = la carta que falta en el álbum (solo la sombra).
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/** Dibuja al Chispi centrado en (cx, cy) con radio de cuerpo r. */
export function drawChispi(g: CanvasRenderingContext2D, card: ChispiCard, cx: number, cy: number, r: number, silhouette = false): void {
  const t = TYPES[card.type];
  const h = hash(card.id);
  const base = silhouette ? '#1d1630' : shade(t.color, ((h % 7) - 3) * 0.06);
  const dark = silhouette ? '#1d1630' : t.dark;
  const ink = '#1d1630';
  g.save();
  g.lineWidth = Math.max(2, r * 0.09);
  g.strokeStyle = ink;
  g.lineJoin = 'round';
  const fill = (col: string) => {
    g.fillStyle = col;
    g.fill();
    g.stroke();
  };

  // Detrás del cuerpo: lo propio de cada tipo
  switch (card.type) {
    case 'luz': {
      g.beginPath();
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        const rr = i % 2 ? r * 1.05 : r * 1.45;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      fill(silhouette ? ink : '#fff3a8');
      break;
    }
    case 'flor': {
      const n = 6 + (h % 3);
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * r * 1.0, cy + Math.sin(a) * r * 1.0, r * 0.45, r * 0.3, a, 0, Math.PI * 2);
        fill(silhouette ? ink : ['#ffb3da', '#fff0a8', '#ff8fc8'][i % 3]);
      }
      break;
    }
    case 'bosque': {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + s * r * 0.75, cy - r * 0.95, r * 0.28, r * 0.6, s * 0.6, 0, Math.PI * 2);
        fill(silhouette ? ink : '#4fb04e');
      }
      break;
    }
    case 'feria': {
      g.beginPath();
      g.moveTo(cx - r * 0.55, cy - r * 0.75);
      g.lineTo(cx, cy - r * 1.75);
      g.lineTo(cx + r * 0.55, cy - r * 0.75);
      g.closePath();
      fill(silhouette ? ink : '#fff3dc');
      if (!silhouette) {
        g.fillStyle = '#ff5a6e';
        g.fillRect(cx - r * 0.12, cy - r * 1.55, r * 0.24, r * 0.7);
      }
      g.beginPath();
      g.arc(cx, cy - r * 1.78, r * 0.14, 0, Math.PI * 2);
      fill(silhouette ? ink : '#ffe066');
      break;
    }
    default:
      break;
  }

  // Cuerpo
  g.beginPath();
  if (card.type === 'agua') {
    g.moveTo(cx, cy - r * 1.5);
    g.bezierCurveTo(cx + r * 0.4, cy - r * 0.9, cx + r * 1.05, cy - r * 0.2, cx + r, cy + r * 0.25);
    g.arc(cx, cy + r * 0.25, r, 0, Math.PI);
    g.bezierCurveTo(cx - r * 1.05, cy - r * 0.2, cx - r * 0.4, cy - r * 0.9, cx, cy - r * 1.5);
  } else if (card.type === 'via') {
    const w = r * 1.9;
    const hh = r * 1.5;
    g.roundRect(cx - w / 2, cy - hh / 2, w, hh, r * 0.25);
  } else if (card.type === 'mar') {
    g.ellipse(cx, cy, r * 1.08, r * 0.9, 0, 0, Math.PI * 2);
  } else {
    g.arc(cx, cy, r, 0, Math.PI * 2);
  }
  fill(base);

  // Brillo
  if (!silhouette) {
    g.beginPath();
    g.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fill();
  }

  // Delante del cuerpo
  switch (card.type) {
    case 'radio': {
      g.beginPath();
      g.moveTo(cx + r * 0.3, cy - r * 0.9);
      g.lineTo(cx + r * 0.6, cy - r * 1.7);
      g.stroke();
      g.beginPath();
      g.arc(cx + r * 0.6, cy - r * 1.75, r * 0.14, 0, Math.PI * 2);
      fill(silhouette ? ink : '#ff4fd8');
      if (!silhouette) {
        g.lineWidth = r * 0.06;
        for (const k of [0.32, 0.5]) {
          g.beginPath();
          g.arc(cx + r * 0.6, cy - r * 1.75, r * k, -1.2, -0.2);
          g.stroke();
        }
        g.lineWidth = Math.max(2, r * 0.09);
      }
      break;
    }
    case 'ruedas':
    case 'via': {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(cx + s * r * 0.6, cy + r * 0.95, r * 0.32, 0, Math.PI * 2);
        fill(silhouette ? ink : card.type === 'via' ? '#3d3550' : '#7dff8a');
        if (!silhouette) {
          g.beginPath();
          g.arc(cx + s * r * 0.6, cy + r * 0.95, r * 0.1, 0, Math.PI * 2);
          g.fillStyle = ink;
          g.fill();
        }
      }
      if (card.type === 'via' && !silhouette) {
        g.fillStyle = dark;
        g.fillRect(cx - r * 0.95, cy - r * 0.95, r * 1.9, r * 0.22);
      }
      break;
    }
    case 'mar': {
      if (!silhouette) {
        g.lineWidth = r * 0.07;
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.beginPath();
        for (let i = 0; i <= 8; i += 1) g.lineTo(cx - r * 0.8 + i * r * 0.2, cy + r * 0.55 + (i % 2 ? -1 : 1) * r * 0.08);
        g.stroke();
        g.strokeStyle = ink;
        g.lineWidth = Math.max(2, r * 0.09);
      }
      break;
    }
    default:
      break;
  }

  // Cara: ojos (tres estilos) y boca
  if (!silhouette) {
    const eyeStyle = h % 3;
    const ey = cy - r * 0.08;
    for (const s of [-1, 1]) {
      g.beginPath();
      if (eyeStyle === 0) g.ellipse(cx + s * r * 0.33, ey, r * 0.13, r * 0.21, 0, 0, Math.PI * 2);
      else if (eyeStyle === 1) g.arc(cx + s * r * 0.33, ey, r * 0.15, 0, Math.PI * 2);
      else g.ellipse(cx + s * r * 0.33, ey, r * 0.17, r * 0.12, 0, 0, Math.PI * 2);
      g.fillStyle = ink;
      g.fill();
      g.beginPath();
      g.arc(cx + s * r * 0.33 - r * 0.04, ey - r * 0.07, r * 0.05, 0, Math.PI * 2);
      g.fillStyle = '#fff';
      g.fill();
    }
    // Cachetes
    g.fillStyle = 'rgba(255,120,140,0.45)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * r * 0.58, cy + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    if (h % 2) g.arc(cx, cy + r * 0.2, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    else {
      g.arc(cx, cy + r * 0.22, r * 0.14, 0, Math.PI);
      g.fillStyle = '#7a2a2a';
      g.fill();
    }
    g.stroke();
  }
  g.restore();
}

/** Carta completa (para el álbum y los sobres): marco del tipo, dibujo, nombre e ícono. */
export function drawCard(canvas: HTMLCanvasElement, id: string, owned = true): void {
  const card = CARD_BY_ID.get(id);
  const g = canvas.getContext('2d');
  if (!card || !g) return;
  const W = canvas.width;
  const H = canvas.height;
  const t = TYPES[card.type];
  g.clearRect(0, 0, W, H);
  const r = Math.min(W, H) * 0.06;
  g.beginPath();
  g.roundRect(2, 2, W - 4, H - 4, r);
  if (owned) {
    if (card.rarity === 'dorada') {
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, '#fff3a8');
      gr.addColorStop(0.5, '#ffc23a');
      gr.addColorStop(1, '#b8860b');
      g.fillStyle = gr;
    } else g.fillStyle = t.color;
  } else g.fillStyle = '#3a3156';
  g.fill();
  g.lineWidth = Math.max(2, W * 0.02);
  g.strokeStyle = '#1d1630';
  g.stroke();
  // Ventana del dibujo
  const pad = W * 0.08;
  const winH = H * 0.58;
  g.beginPath();
  g.roundRect(pad, pad, W - pad * 2, winH, r * 0.7);
  const bg = g.createRadialGradient(W / 2, pad + winH * 0.5, 4, W / 2, pad + winH * 0.5, W * 0.6);
  bg.addColorStop(0, owned ? '#3c6a8a' : '#2a2146');
  bg.addColorStop(1, '#1d1630');
  g.fillStyle = bg;
  g.fill();
  g.stroke();
  if (owned && card.rarity !== 'comun') {
    g.fillStyle = card.rarity === 'dorada' ? '#ffe066' : '#9be7ff';
    for (let i = 0; i < 10; i += 1) {
      const x = pad + ((i * 37) % (W - pad * 2));
      const y = pad + ((i * 53) % winH);
      g.fillRect(x, y, W * 0.02, W * 0.02);
    }
  }
  drawChispi(g, card, W / 2, pad + winH * 0.56, W * 0.19, !owned);
  // Nombre e ícono
  g.fillStyle = owned ? '#1d1630' : '#8e86a8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${Math.round(W * 0.12)}px "Bowlby One", "Arial Black", sans-serif`;
  g.fillText(owned ? card.name : '???', W / 2, pad + winH + H * 0.12);
  g.font = `${Math.round(W * 0.1)}px sans-serif`;
  g.fillText(`${t.icon}${owned && card.rarity !== 'comun' ? (card.rarity === 'dorada' ? ' ★' : ' ✦') : ''}`, W / 2, pad + winH + H * 0.24);
}
