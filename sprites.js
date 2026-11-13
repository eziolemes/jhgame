'use strict';
/*
 * Corre, Jensen! — sprites desenhados em código (nenhuma imagem externa).
 * Todos os personagens são desenhados com os pés em (x, y), virados para a direita (face = 1).
 * Compartilhado por game.js e og.html.
 */
window.SPR = (() => {
  const TAU = Math.PI * 2;

  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function ell(c, x, y, rx, ry, rot = 0) {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  }
  function shadow(c, x, y, rx, ry, a = 0.32) {
    c.fillStyle = `rgba(0,0,0,${a})`;
    ell(c, x, y, rx, ry);
    c.fill();
  }
  // membro: retângulo arredondado girado a partir de um pivô (ombro/quadril)
  function limb(c, px, py, ang, w, len, col, endCol, endR) {
    c.save();
    c.translate(px, py);
    c.rotate(ang);
    c.fillStyle = col;
    rr(c, -w / 2, 0, w, len, w / 2);
    c.fill();
    if (endCol) {
      c.fillStyle = endCol;
      ell(c, 0, len, endR || w * 0.55, endR || w * 0.55);
      c.fill();
    }
    c.restore();
  }
  // ponta do membro (para posicionar objetos na mão)
  function limbEnd(px, py, ang, len) {
    return [px - Math.sin(ang) * len, py + Math.cos(ang) * len];
  }
  function leg(c, hx, ang, pants, shoe) {
    c.save();
    c.translate(hx, -18);
    c.rotate(ang);
    c.fillStyle = pants;
    rr(c, -3.5, 0, 7, 16, 3);
    c.fill();
    c.fillStyle = shoe;
    ell(c, 2, 16.5, 5, 2.6);
    c.fill();
    c.restore();
  }
  function gait(o, speed) {
    const t = o.t || 0, mv = o.moving ? 1 : 0;
    const ph = t * speed;
    return {
      sw: Math.sin(ph) * mv,
      bob: mv ? -Math.abs(Math.cos(ph)) * 2.2 : Math.sin(t * 2.3) * 0.5,
    };
  }

  // ===================== JENSEN =====================
  // cabelo preto penteado pra trás com fios grisalhos, óculos, jaqueta de couro preta
  function jensen(c, x, y, o = {}) {
    const s = o.scale || 1, f = o.face || 1;
    const { sw, bob } = gait(o, 14);
    if (!o.noShadow) shadow(c, x, y + 1, 15 * s, 4.5 * s);
    c.save();
    c.translate(x, y);
    c.scale(f * s, s);
    if (o.spin) c.rotate(o.spin);

    leg(c, -3, sw * 0.6, '#1c1d22', '#050505');
    c.translate(0, bob);
    limb(c, -4, -36, sw * 0.75, 6, 16, '#0c0c0e', '#e8c39c', 2.8);
    c.translate(0, -bob);
    leg(c, 3, -sw * 0.6, '#25262c', '#0a0a0a');
    c.translate(0, bob);

    // jaqueta de couro
    const g = c.createLinearGradient(-12, -41, 12, -14);
    g.addColorStop(0, '#45474f');
    g.addColorStop(0.32, '#18191d');
    g.addColorStop(1, '#070708');
    c.fillStyle = g;
    rr(c, -11.5, -41, 23, 26, 6);
    c.fill();
    // camiseta preta
    c.fillStyle = '#030303';
    c.beginPath(); c.moveTo(0.5, -41); c.lineTo(9.5, -41); c.lineTo(5, -31); c.closePath(); c.fill();
    // lapelas
    c.fillStyle = '#2c2e35';
    c.beginPath(); c.moveTo(-0.5, -41); c.lineTo(4.4, -30); c.lineTo(1.8, -41); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(10.5, -41); c.lineTo(5.6, -30); c.lineTo(8.2, -41); c.closePath(); c.fill();
    // zíper, brilho do couro, barra
    c.strokeStyle = '#70737c'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(5, -30); c.lineTo(5, -16.5); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-8, -38); c.quadraticCurveTo(-9.5, -29, -7.5, -19.5); c.stroke();
    c.fillStyle = '#050506';
    rr(c, -11.5, -18.5, 23, 3.5, 1.5); c.fill();

    // braço da frente
    if (o.wave) limb(c, 4, -37, -2.6 + Math.sin((o.t || 0) * 9) * 0.25, 6.5, 16, '#141519', '#ecc6a0', 2.9);
    else limb(c, 4, -37, -sw * 0.75, 6.5, 16, '#141519', '#ecc6a0', 2.9);

    // pescoço e cabeça
    c.fillStyle = '#d9b089';
    rr(c, 1, -45, 7, 6, 2); c.fill();
    c.fillStyle = '#ecc6a0';
    ell(c, 2, -51, 10, 10.5); c.fill();
    // cabelo
    c.fillStyle = '#141518';
    c.beginPath();
    c.moveTo(-8.6, -44.5);
    c.quadraticCurveTo(-11.5, -59, 0, -62.5);
    c.quadraticCurveTo(10.5, -63, 12.8, -55.5);
    c.quadraticCurveTo(6.5, -58.4, 1.2, -56);
    c.quadraticCurveTo(-2.2, -54, -4.2, -48);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(200,202,208,0.6)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-6.2, -51); c.quadraticCurveTo(-6, -59, 3.5, -60.6); c.stroke();
    c.beginPath(); c.moveTo(-7.8, -46.5); c.quadraticCurveTo(-9, -55, -2, -59); c.stroke();
    // orelha
    c.fillStyle = '#d9ae86';
    ell(c, -2.3, -49.5, 2.3, 3.1); c.fill();
    // óculos
    c.strokeStyle = '#151515'; c.lineWidth = 1.3;
    rr(c, 4, -53.4, 5.8, 4.5, 1.5); c.stroke();
    c.beginPath(); c.moveTo(9.8, -52); c.lineTo(11.8, -52); c.stroke();
    c.beginPath(); c.moveTo(4, -52.4); c.lineTo(-1.4, -51.2); c.stroke();
    c.fillStyle = 'rgba(170,220,255,0.28)';
    rr(c, 4.6, -52.9, 4.6, 3.5, 1.2); c.fill();
    // sobrancelha e sorriso
    c.strokeStyle = '#141414'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(4.4, -55.2); c.lineTo(9.8, -55.6); c.stroke();
    c.strokeStyle = '#8a5a40'; c.lineWidth = 1;
    c.beginPath();
    if (o.worried) c.arc(8, -43.4, 2.2, 1.2 * Math.PI, 1.85 * Math.PI);
    else c.arc(8, -46.6, 2.4, 0.15 * Math.PI, 0.75 * Math.PI);
    c.stroke();
    c.restore();
  }

  // ===================== ESPIÃS =====================
  // espiãs glamourosas: cabelo preto brilhante, batom vermelho, vestido justo e salto.
  // Sem exageros caricatos nos traços: o "disfarce" agora é só o charme.
  const OUTFITS = [
    ['#d81b60', '#9c1145'], // pink
    ['#14937f', '#0c6457'], // esmeralda
    ['#f3efe6', '#c9c1b2'], // branco pérola
    ['#6f3ad8', '#4b259a'], // violeta
    ['#16161b', '#000000'], // pretinho básico
    ['#e0a22a', '#a77612'], // dourado
  ];
  function heelLeg(c, hx, ang, legCol, shoe) {
    c.save();
    c.translate(hx, -18);
    c.rotate(ang);
    c.fillStyle = legCol;
    rr(c, -2.7, 0, 5.4, 16.2, 2.7);
    c.fill();
    c.fillStyle = shoe;
    c.beginPath();
    c.moveTo(-2.9, 14.6); c.lineTo(1.5, 15); c.lineTo(5.8, 16.8); c.lineTo(5.6, 18.4); c.lineTo(-1.4, 18.4); c.lineTo(-1.4, 16.9); c.lineTo(-3, 16.9);
    c.closePath(); c.fill();
    c.fillRect(-3, 16, 1.5, 2.4); // salto
    c.restore();
  }
  function spy(c, x, y, o = {}) {
    const s = o.scale || 1, f = o.face || 1, t = o.t || 0, kind = o.kind || 'fan';
    const look = (o.look ?? 0) | 0;
    const { sw, bob } = gait(o, 12);
    const skin = o.skin || '#f1cfb0', hair = o.hair || '#121015';
    const skinDark = 'rgba(120,70,40,0.18)';
    // 0 = longo liso com franja, 1 = rabo de cavalo alto / coque, 2 = chanel
    const style = kind === 'diner' ? 1 : kind === 'watcher' ? 1 : look % 3;
    const [dress, dressDark] = kind === 'diner' ? ['#c8102e', '#8a0a20'] : kind === 'watcher' ? ['#17171d', '#050507'] : OUTFITS[look % OUTFITS.length];
    const shoe = kind === 'diner' ? '#8a0a20' : '#0c0c0f';
    if (!o.noShadow) shadow(c, x, y + 1, 13 * s, 4.3 * s);
    c.save();
    c.translate(x, y);
    c.scale(f * s, s);

    // cabelo de trás (longo liso / rabo de cavalo)
    c.translate(0, bob);
    c.fillStyle = hair;
    if (style === 0) { rr(c, -10, -60, 14.5, 31, 6.5); c.fill(); }
    if (style === 1 && kind !== 'diner') {
      const sway = Math.sin(t * 7) * (o.moving ? 2.2 : 0.6);
      c.beginPath();
      c.moveTo(-6, -59);
      c.quadraticCurveTo(-15 + sway, -52, -12 + sway, -36);
      c.quadraticCurveTo(-9 + sway, -44, -3, -55);
      c.closePath(); c.fill();
    }
    c.translate(0, -bob);

    heelLeg(c, -3, sw * 0.55, skin, shoe);
    c.fillStyle = skinDark;
    c.save(); c.translate(-3, -18); c.rotate(sw * 0.55); rr(c, -2.7, 0, 5.4, 16.2, 2.7); c.fill(); c.restore();
    c.translate(0, bob);
    limb(c, -3, -37.5, sw * 0.6, 4.6, 15, kind === 'watcher' ? dress : skin, skin, 2.3);
    c.translate(0, -bob);
    heelLeg(c, 3, -sw * 0.55, skin, shoe);
    c.translate(0, bob);

    // vestido justo (ombro, cintura marcada, saia até o joelho)
    c.fillStyle = dress;
    c.beginPath();
    c.moveTo(-7.5, -41.5);
    c.lineTo(8.5, -41.5);
    c.quadraticCurveTo(10.5, -36, 7, -29.5);
    c.quadraticCurveTo(11, -22, 12, -15.5);
    c.lineTo(-10.5, -15.5);
    c.quadraticCurveTo(-9.5, -22, -5.6, -29.5);
    c.quadraticCurveTo(-9.5, -36, -7.5, -41.5);
    c.closePath(); c.fill();
    // decote em V e brilho do tecido
    c.fillStyle = skin;
    c.beginPath(); c.moveTo(1.8, -41.5); c.lineTo(8.2, -41.5); c.lineTo(5.6, -37.2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(-4.8, -39.5); c.lineTo(-2.6, -39.5); c.lineTo(-5, -17); c.lineTo(-7.6, -17); c.closePath(); c.fill();
    c.fillStyle = dressDark;
    rr(c, -6.4, -30.6, 13.8, 2.2, 1); c.fill(); // cinto fino
    c.fillStyle = '#ffd23f';
    rr(c, 4.2, -30.9, 2.6, 2.8, 0.8); c.fill(); // fivela
    if (kind === 'watcher') { // gola alta de espiã
      c.fillStyle = dress;
      rr(c, 0.5, -44, 7.5, 4, 1.5); c.fill();
    } else {
      c.fillStyle = '#fff6e0';
      ell(c, 5.2, -39, 1.1, 1.1); c.fill(); // pingente
    }

    // pescoço e cabeça
    c.fillStyle = skin;
    if (kind !== 'watcher') { rr(c, 1, -45, 5.4, 5.5, 2); c.fill(); }
    ell(c, 2.4, -51, 8.8, 9.6); c.fill();
    // queixo um pouco mais fino
    c.beginPath(); c.moveTo(-3, -45.6); c.quadraticCurveTo(5, -40.4, 10.6, -47.5); c.lineTo(9, -50); c.closePath(); c.fill();

    // cabelo da frente
    c.fillStyle = hair;
    c.beginPath();
    if (style === 0) { // liso com franja reta
      c.moveTo(-6.6, -42);
      c.quadraticCurveTo(-9.6, -50, -7.6, -57);
      c.quadraticCurveTo(-3, -63.2, 4.5, -62);
      c.quadraticCurveTo(11.6, -60.4, 11.6, -54);
      c.lineTo(11.2, -54.2); c.lineTo(3.5, -54.6);
      c.quadraticCurveTo(-0.5, -54, -1.4, -49);
      c.lineTo(-1.6, -42);
    } else if (style === 1) { // puxado para trás
      c.moveTo(-6.4, -46);
      c.quadraticCurveTo(-9.4, -57, -2, -61.4);
      c.quadraticCurveTo(7, -64, 11.2, -56.4);
      c.quadraticCurveTo(6, -58.8, 2, -57.6);
      c.quadraticCurveTo(-1.6, -56, -2.4, -49.5);
    } else { // chanel com franja de lado
      c.moveTo(-7.2, -43);
      c.quadraticCurveTo(-10.6, -54, -5, -60.4);
      c.quadraticCurveTo(2, -64.4, 9.6, -60.4);
      c.quadraticCurveTo(12.8, -57.6, 11.8, -52.4);
      c.quadraticCurveTo(7, -57.2, 2.6, -55.2);
      c.quadraticCurveTo(0, -53, -1, -48);
      c.quadraticCurveTo(-1.2, -44.6, -3.4, -42.4);
    }
    c.closePath(); c.fill();
    if (style === 1) { // coque
      ell(c, -5.6, -60.6, 4.6, 4.4); c.fill();
      c.strokeStyle = kind === 'diner' ? '#ffd23f' : '#c8102e'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-10.5, -63.5); c.lineTo(-1.5, -58.2); c.stroke(); // grampo
    }
    // brilho do cabelo
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(1.5, -53, 7.6, 1.12 * Math.PI, 1.42 * Math.PI); c.stroke();

    // orelha e brinco
    c.fillStyle = skin;
    ell(c, -1.4, -49.6, 1.9, 2.6); c.fill();
    c.fillStyle = '#ffd23f';
    ell(c, -1.2, -46.3, 1.1, 1.1); c.fill();

    if (kind === 'watcher') {
      // binóculo cobrindo os olhos
      c.fillStyle = '#1b1b1d';
      rr(c, 5.4, -55, 9.5, 7.2, 2); c.fill();
      c.fillStyle = o.alert ? '#ff5252' : '#7fd6ff';
      ell(c, 15.2, -51.4, 1.8, 2.7); c.fill();
    } else {
      // olho com delineado, sobrancelha fina
      c.fillStyle = '#17110f';
      ell(c, 7.2, -51.4, 1.35, 1.65); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      ell(c, 7.6, -51.9, 0.45, 0.45); c.fill();
      c.strokeStyle = '#17110f'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(5.6, -52.9); c.quadraticCurveTo(7.4, -53.7, 9.6, -53.4); c.lineTo(10.4, -54.3); c.stroke();
      c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(5.4, -55.6); c.quadraticCurveTo(7.6, -57, 10, -56); c.stroke();
    }
    // blush e batom
    c.fillStyle = 'rgba(255,110,130,0.32)';
    ell(c, 6.4, -48.2, 2.2, 1.3); c.fill();
    c.fillStyle = '#d0213f';
    ell(c, 8.8, -45.6, 1.9, 1.05); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    ell(c, 8.5, -46, 0.6, 0.3); c.fill();

    // braço da frente + acessório
    const arm = kind === 'watcher' ? dress : skin;
    if (kind === 'fan') {
      const ang = -2.05 + Math.sin(t * 3) * 0.1; // celular esticado à frente, sem cobrir o rosto
      limb(c, 4, -37.5, ang, 4.6, 15, skin, skin, 2.3);
      const [ex, ey] = limbEnd(4, -37.5, ang, 15);
      c.fillStyle = '#121214';
      rr(c, ex - 2.8, ey - 10, 6.4, 10.5, 1.5); c.fill();
      c.fillStyle = Math.sin(t * 5 + x) > 0.75 ? '#ffffff' : '#79d4ff';
      c.fillRect(ex - 1.7, ey - 8.8, 4.2, 7.6);
    } else if (kind === 'watcher') {
      limb(c, 4, -37.5, -2.2, 4.8, 13, arm, skin, 2.3);
    } else if (kind === 'diner') {
      const ang = -1.25 + Math.sin(t * 2) * 0.08;
      limb(c, 4, -37.5, ang, 4.4, 14, skin, skin, 2.2);
      const [ex, ey] = limbEnd(4, -37.5, ang, 14);
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(ex + 1, ey - 2); c.lineTo(ex + 1, ey + 3); c.moveTo(ex - 1, ey + 3); c.lineTo(ex + 3, ey + 3); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      ell(c, ex + 1, ey - 5.5, 3, 3.4); c.fill();
      c.fillStyle = '#8a0c2b';
      c.beginPath(); c.ellipse(ex + 1, ey - 5, 2.6, 2.6, 0, 0, Math.PI); c.fill();
    } else {
      limb(c, 4, -37.5, -sw * 0.6, 4.6, 15, arm, skin, 2.3);
    }
    c.restore();
  }

  // assessor(a) do Congresso: terno, crachá, pilha de intimações
  function aide(c, x, y, o = {}) {
    const s = o.scale || 1, f = o.face || 1;
    const { sw, bob } = gait(o, 12);
    const skin = o.skin || '#e0b48f', hair = o.hair || '#2a1d16';
    if (!o.noShadow) shadow(c, x, y + 1, 14 * s, 4.5 * s);
    c.save();
    c.translate(x, y);
    c.scale(f * s, s);
    leg(c, -3, sw * 0.55, '#232833', '#0d0d0d');
    c.translate(0, bob);
    limb(c, -3, -37, sw * 0.6, 5.5, 15, '#2a2f3a', skin, 2.5);
    c.translate(0, -bob);
    leg(c, 3, -sw * 0.55, '#2a303b', '#111');
    c.translate(0, bob);
    c.fillStyle = '#3d4454';
    rr(c, -11, -41, 22, 25, 5); c.fill();
    c.fillStyle = '#f2f2ee';
    c.beginPath(); c.moveTo(1, -41); c.lineTo(9, -41); c.lineTo(5, -31); c.closePath(); c.fill();
    c.fillStyle = '#b3123a';
    c.beginPath(); c.moveTo(4.2, -39); c.lineTo(5.8, -39); c.lineTo(6.2, -30); c.lineTo(5, -28.5); c.lineTo(3.8, -30); c.closePath(); c.fill();
    c.strokeStyle = '#2f6fd6'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0.5, -41); c.lineTo(-1, -29); c.stroke();
    c.fillStyle = '#ffd23f';
    rr(c, -3.6, -29.5, 5.4, 6.5, 1); c.fill();
    c.fillStyle = skin;
    rr(c, 0, -45, 6, 6, 2); c.fill();
    ell(c, 2, -51, 9.5, 10); c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.moveTo(-8, -47);
    c.quadraticCurveTo(-9.5, -61, 3, -61.6);
    c.quadraticCurveTo(12.5, -61, 11.6, -53.5);
    c.quadraticCurveTo(5, -56.4, -2, -54.5);
    c.quadraticCurveTo(-4, -51, -4.5, -47);
    c.closePath(); c.fill();
    c.fillStyle = '#1a1a1a';
    ell(c, 8, -51.5, 1.2, 1.4); c.fill();
    c.strokeStyle = '#7a4a35'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(6.5, -45.6); c.lineTo(10, -45.6); c.stroke();
    const ang = -1.15;
    limb(c, 4, -37, ang, 5.5, 14, '#3d4454', skin, 2.5);
    const [ex, ey] = limbEnd(4, -37, ang, 14);
    c.save();
    c.translate(ex + 2, ey - 3);
    c.rotate(-0.15);
    c.fillStyle = '#f4f1e8';
    c.fillRect(-4, -6, 9, 11);
    c.fillStyle = '#d8d3c4';
    c.fillRect(-3, -5, 9, 11);
    c.fillStyle = '#b3123a';
    ell(c, 2, 2, 1.6, 1.6); c.fill();
    c.restore();
    c.restore();
  }

  // paparazzo: boné, colete, câmera com flash
  function paparazzi(c, x, y, o = {}) {
    const s = o.scale || 1, f = o.face || 1, t = o.t || 0;
    const { sw, bob } = gait(o, 13);
    const skin = o.skin || '#c68e63';
    if (!o.noShadow) shadow(c, x, y + 1, 14 * s, 4.5 * s);
    c.save();
    c.translate(x, y);
    c.scale(f * s, s);
    leg(c, -3, sw * 0.55, '#3b3a35', '#1a1a1a');
    c.translate(0, bob);
    limb(c, -3, -37, -1.9, 5.5, 13, '#2f3d52', skin, 2.5);
    c.translate(0, -bob);
    leg(c, 3, -sw * 0.55, '#45443e', '#222');
    c.translate(0, bob);
    c.fillStyle = '#2f3d52';
    rr(c, -11, -41, 22, 25, 5); c.fill();
    c.fillStyle = '#7a6e4c';
    rr(c, -11, -41, 9, 24, 3); c.fill();
    rr(c, 4, -41, 7, 24, 3); c.fill();
    c.fillStyle = '#5f5539';
    c.fillRect(-9, -32, 5, 4); c.fillRect(5, -26, 5, 4);
    c.fillStyle = skin;
    rr(c, 0, -45, 6, 6, 2); c.fill();
    ell(c, 2, -51, 9.5, 10); c.fill();
    // boné
    c.fillStyle = '#1d1d1f';
    c.beginPath(); c.arc(2, -55, 10, Math.PI, TAU); c.closePath(); c.fill();
    rr(c, 6, -57, 12, 3, 1.5); c.fill();
    // câmera
    c.fillStyle = '#151515';
    rr(c, 6, -57, 11, 9, 2); c.fill();
    c.fillStyle = '#2b2b2b';
    rr(c, 16, -55.5, 7, 6.5, 1.2); c.fill();
    c.fillStyle = '#5ab0e6';
    ell(c, 23, -52.2, 1.2, 2.6); c.fill();
    c.fillStyle = o.flash ? '#ffffff' : '#cfcfcf';
    rr(c, 8, -63, 6.5, 5, 1); c.fill();
    if (o.aim && Math.sin(t * 20) > 0) {
      c.fillStyle = '#ff3b4e';
      ell(c, 9.5, -52, 1.2, 1.2); c.fill();
    }
    limb(c, 4, -37, -2.05, 5.5, 13, '#2f3d52', skin, 2.5);
    c.restore();
    if (o.flash) {
      const g = c.createRadialGradient(x + 11 * f * s, y - 61 * s, 0, x + 11 * f * s, y - 61 * s, 60 * s);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - 70 * s, y - 130 * s, 140 * s, 140 * s);
    }
  }

  // ===================== ITENS =====================
  function chip(c, x, y, t = 0) {
    const b = Math.sin(t * 4 + x * 0.05) * 2.2;
    shadow(c, x, y + 2, 7, 2.5, 0.25);
    c.save();
    c.translate(x, y - 12 + b);
    c.strokeStyle = '#c9cdd3'; c.lineWidth = 1.2;
    c.beginPath();
    for (let i = -1; i <= 1; i++) {
      c.moveTo(i * 4, -8); c.lineTo(i * 4, -10.5);
      c.moveTo(i * 4, 8); c.lineTo(i * 4, 10.5);
      c.moveTo(-8, i * 4); c.lineTo(-10.5, i * 4);
      c.moveTo(8, i * 4); c.lineTo(10.5, i * 4);
    }
    c.stroke();
    c.fillStyle = '#1d2617';
    rr(c, -8, -8, 16, 16, 2.5); c.fill();
    c.strokeStyle = '#7dff3a'; c.lineWidth = 1.2;
    rr(c, -8, -8, 16, 16, 2.5); c.stroke();
    c.fillStyle = '#7dff3a';
    rr(c, -4, -4, 8, 8, 1.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(-3, -3, 2.5, 2.5);
    c.restore();
  }

  function gpuBox(c, x, y, t = 0, s = 1, label = 'GPU') {
    const b = Math.sin(t * 3 + x * 0.03) * 1.5;
    shadow(c, x, y + 2, 18 * s, 4 * s, 0.3);
    c.save();
    c.translate(x, y + b);
    c.scale(s, s);
    const glow = 0.35 + Math.sin(t * 5) * 0.15;
    c.fillStyle = `rgba(125,255,58,${glow * 0.35})`;
    ell(c, 0, -12, 26, 18); c.fill();
    c.fillStyle = '#121315';
    rr(c, -17, -24, 34, 22, 3); c.fill();
    c.fillStyle = '#7dff3a';
    c.fillRect(-17, -9, 34, 2.5);
    c.strokeStyle = '#3b3e45'; c.lineWidth = 1;
    rr(c, -17, -24, 34, 22, 3); c.stroke();
    for (const fx of [-8, 8]) {
      c.fillStyle = '#26282d';
      ell(c, fx, -16.5, 6, 6); c.fill();
      c.strokeStyle = '#4a4d55'; c.lineWidth = 1.2;
      c.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = t * 9 + k * (TAU / 3);
        c.moveTo(fx, -16.5); c.lineTo(fx + Math.cos(a) * 5, -16.5 + Math.sin(a) * 5);
      }
      c.stroke();
    }
    c.fillStyle = '#7dff3a';
    c.font = 'bold 6px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText(label, 0, -3.5);
    c.restore();
  }

  function memo(c, x, y, t = 0) {
    const b = Math.sin(t * 3.4 + x * 0.04) * 2;
    shadow(c, x, y + 2, 10, 3, 0.25);
    c.save();
    c.translate(x, y - 14 + b);
    c.rotate(Math.sin(t * 2) * 0.08);
    c.fillStyle = `rgba(255,210,63,${0.25 + Math.sin(t * 6) * 0.1})`;
    ell(c, 0, 0, 18, 18); c.fill();
    c.fillStyle = '#f4f1e8';
    c.fillRect(-9, -12, 18, 23);
    c.fillStyle = '#b9b4a6';
    for (let i = 0; i < 4; i++) c.fillRect(-6, -7 + i * 4, 12 - (i % 2) * 4, 1.2);
    c.save();
    c.rotate(-0.3);
    c.strokeStyle = '#d0213f'; c.lineWidth = 1.2;
    c.strokeRect(-8, -3, 16, 7);
    c.fillStyle = '#d0213f';
    c.font = 'bold 5.5px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('MEMO', 0, 2.6);
    c.restore();
    c.restore();
  }

  // café da manhã americano clássico: panquecas, ovos, bacon
  function slam(c, x, y, t = 0) {
    const b = Math.sin(t * 3 + x * 0.05) * 1.8;
    shadow(c, x, y + 2, 15, 3.5, 0.28);
    c.save();
    c.translate(x, y - 6 + b);
    c.fillStyle = `rgba(255,95,162,${0.22 + Math.sin(t * 6) * 0.08})`;
    ell(c, 0, -4, 24, 15); c.fill();
    c.fillStyle = '#f4f4f0';
    ell(c, 0, 0, 17, 6.5); c.fill();
    c.fillStyle = '#d8d8d2';
    ell(c, 0, 0.5, 12.5, 4.2); c.fill();
    c.fillStyle = '#c98b40';
    ell(c, -5, -1.5, 7, 3); c.fill();
    c.fillStyle = '#dca25a';
    ell(c, -5, -3.6, 7, 3); c.fill();
    c.fillStyle = '#ffe680';
    c.fillRect(-6.5, -6.4, 3, 2);
    c.fillStyle = '#ffffff';
    ell(c, 5.5, -1, 4.2, 2.6); c.fill();
    c.fillStyle = '#ffb300';
    ell(c, 5.5, -1.3, 1.6, 1.3); c.fill();
    c.strokeStyle = '#9b3b26'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-2, 2.5); c.quadraticCurveTo(1, 0.5, 3, 2.8); c.quadraticCurveTo(6, 4.6, 9, 2.6); c.stroke();
    c.restore();
  }

  function heart(c, x, y, size, col) {
    c.save();
    c.translate(x, y);
    c.scale(size / 10, size / 10);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 3);
    c.bezierCurveTo(-8, -3, -4, -9, 0, -5);
    c.bezierCurveTo(4, -9, 8, -3, 0, 3);
    c.closePath(); c.fill();
    c.restore();
  }

  function kiss(c, x, y, t = 0) {
    c.save();
    c.translate(x, y);
    c.rotate(Math.sin(t * 10) * 0.3);
    c.fillStyle = 'rgba(255,95,162,0.35)';
    ell(c, 0, 0, 11, 11); c.fill();
    heart(c, 0, 1, 12, '#ff4f97');
    c.fillStyle = 'rgba(255,255,255,0.7)';
    ell(c, -2.6, -2.4, 1.4, 1); c.fill();
    c.restore();
  }

  function paper(c, x, y, t = 0) {
    c.save();
    c.translate(x, y);
    c.rotate(t * 9);
    c.fillStyle = '#f4f1e8';
    c.fillRect(-6, -7.5, 12, 15);
    c.fillStyle = '#b9b4a6';
    c.fillRect(-4, -4.5, 8, 1);
    c.fillRect(-4, -2, 8, 1);
    c.fillRect(-4, 0.5, 5, 1);
    c.fillStyle = '#b3123a';
    ell(c, 2.5, 4, 2.2, 2.2); c.fill();
    c.restore();
  }

  // ===================== OBSTÁCULOS =====================
  // o = { x, y, hw, hh, kind } — pegada retangular no chão; o desenho sobe a partir da borda de baixo
  function obstacle(c, o, t = 0) {
    const L = o.x - o.hw, R = o.x + o.hw, T = o.y - o.hh, B = o.y + o.hh, w = R - L;
    shadow(c, o.x, B, o.hw + 6, 5, 0.3);
    switch (o.kind) {
      case 'speaker': {
        c.fillStyle = '#121317'; rr(c, L, B - 62, w, 62, 4); c.fill();
        c.strokeStyle = '#2a2c33'; c.lineWidth = 2; rr(c, L, B - 62, w, 62, 4); c.stroke();
        for (const [cy, r] of [[B - 44, 11], [B - 18, 8]]) {
          c.fillStyle = '#24262c'; ell(c, o.x, cy, r, r); c.fill();
          c.fillStyle = '#0a0a0c'; ell(c, o.x, cy, r * 0.45, r * 0.45); c.fill();
        }
        c.fillStyle = Math.sin(t * 4 + o.x) > 0 ? '#7dff3a' : '#2e5a18';
        ell(c, R - 6, B - 57, 1.6, 1.6); c.fill();
        break;
      }
      case 'roadcase': {
        c.fillStyle = '#1c1d21'; rr(c, L, B - 36, w, 36, 3); c.fill();
        c.fillStyle = '#2a2b31'; c.fillRect(L, B - 36, w, 8);
        c.fillStyle = '#9da1a8';
        for (const px of [L, R - 6]) for (const py of [B - 36, B - 6]) c.fillRect(px, py, 6, 6);
        c.fillStyle = '#ffd23f'; c.font = 'bold 8px system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText('FRÁGIL', o.x, B - 14);
        break;
      }
      case 'camrig': {
        c.strokeStyle = '#3a3c43'; c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(o.x, B - 40); c.lineTo(L + 2, B); c.moveTo(o.x, B - 40); c.lineTo(R - 2, B); c.moveTo(o.x, B - 40); c.lineTo(o.x, B - 2);
        c.stroke();
        c.fillStyle = '#18191d'; rr(c, o.x - 13, B - 56, 26, 16, 3); c.fill();
        c.fillStyle = '#2b2d33'; rr(c, o.x + 10, B - 53, 10, 10, 2); c.fill();
        c.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b4e' : '#5a1520'; ell(c, o.x - 8, B - 52, 1.6, 1.6); c.fill();
        break;
      }
      case 'planter': {
        c.fillStyle = '#4b4f57'; rr(c, L, B - 22, w, 22, 3); c.fill();
        c.fillStyle = '#5d626b'; c.fillRect(L, B - 22, w, 5);
        const greens = ['#2f6b2a', '#3d8a33', '#24561f'];
        for (let i = 0; i < 5; i++) {
          c.fillStyle = greens[i % 3];
          ell(c, L + 8 + i * (w - 16) / 4, B - 26 - (i % 2) * 6, 11, 10); c.fill();
        }
        break;
      }
      case 'tree': {
        c.fillStyle = '#4b4f57'; ell(c, o.x, B - 6, o.hw, 7); c.fill();
        c.fillStyle = '#4a3423'; c.fillRect(o.x - 3, B - 60, 6, 54);
        const greens = ['#24561f', '#2f6b2a', '#3d8a33'];
        for (let i = 0; i < 5; i++) {
          c.fillStyle = greens[i % 3];
          ell(c, o.x + Math.cos(i * 1.3) * 14, B - 78 + Math.sin(i * 2.1) * 10, 18, 16); c.fill();
        }
        break;
      }
      case 'bench': {
        c.fillStyle = '#2b2d33'; c.fillRect(L + 4, B - 14, 4, 14); c.fillRect(R - 8, B - 14, 4, 14);
        c.fillStyle = '#8a6a45';
        for (let i = 0; i < 3; i++) c.fillRect(L, B - 18 - i * 6, w, 4);
        break;
      }
      case 'table': {
        for (const sx of [L - 6, R + 6]) {
          c.fillStyle = '#a8a8a8'; c.fillRect(sx - 1.5, B - 18, 3, 16);
          c.fillStyle = '#c4213a'; ell(c, sx, B - 20, 8, 4); c.fill();
          c.fillStyle = '#e04456'; ell(c, sx, B - 21.5, 7, 2.6); c.fill();
        }
        c.fillStyle = '#9ea2a8'; c.fillRect(o.x - 2.5, B - 30, 5, 28);
        c.fillStyle = '#c9c3b2'; ell(c, o.x, B - 32, o.hw, 9); c.fill();
        c.strokeStyle = '#e6e6e6'; c.lineWidth = 2; ell(c, o.x, B - 32, o.hw, 9); c.stroke();
        c.fillStyle = '#ffffff'; ell(c, o.x - 6, B - 33, 5, 2.2); c.fill();
        c.fillStyle = '#d0213f'; c.fillRect(o.x + 6, B - 40, 3, 7);
        c.fillStyle = '#ffd23f'; c.fillRect(o.x + 10, B - 39, 3, 6);
        break;
      }
      case 'booth': {
        c.fillStyle = '#7d1520'; rr(c, L, B - 44, w, 44, 6); c.fill();
        c.fillStyle = '#a3242e'; rr(c, L + 3, B - 41, w - 6, 26, 5); c.fill();
        c.strokeStyle = '#6b1019'; c.lineWidth = 1.2;
        c.beginPath();
        for (let i = 1; i < 4; i++) { const px = L + 3 + i * (w - 6) / 4; c.moveTo(px, B - 39); c.lineTo(px, B - 17); }
        c.stroke();
        c.fillStyle = '#c0c4ca'; c.fillRect(L, B - 15, w, 3);
        c.fillStyle = '#a3242e'; c.fillRect(L + 2, B - 12, w - 4, 10);
        break;
      }
      case 'column': {
        c.fillStyle = '#bdb7a8'; c.fillRect(L - 4, B - 10, w + 8, 10);
        const g = c.createLinearGradient(L, 0, R, 0);
        g.addColorStop(0, '#9e988a'); g.addColorStop(0.4, '#f0ebde'); g.addColorStop(1, '#a7a193');
        c.fillStyle = g; c.fillRect(L + 2, B - 118, w - 4, 108);
        c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
        c.beginPath();
        for (let i = 1; i < 5; i++) { const px = L + 2 + i * (w - 4) / 5; c.moveTo(px, B - 116); c.lineTo(px, B - 12); }
        c.stroke();
        c.fillStyle = '#d9d3c4'; c.fillRect(L - 6, B - 128, w + 12, 10);
        c.fillStyle = '#c9c3b4'; c.fillRect(L - 3, B - 132, w + 6, 4);
        break;
      }
      case 'podium': {
        c.fillStyle = '#5b3d26';
        c.beginPath(); c.moveTo(L, B); c.lineTo(R, B); c.lineTo(R - 3, B - 46); c.lineTo(L + 3, B - 46); c.closePath(); c.fill();
        c.fillStyle = '#7a5434'; c.fillRect(L - 2, B - 50, w + 4, 6);
        c.fillStyle = '#ffd23f'; ell(c, o.x, B - 28, 7, 7); c.fill();
        c.fillStyle = '#5b3d26'; ell(c, o.x, B - 28, 4, 4); c.fill();
        c.strokeStyle = '#222'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(o.x + 4, B - 50); c.quadraticCurveTo(o.x + 10, B - 58, o.x + 6, B - 64); c.stroke();
        c.fillStyle = '#222'; ell(c, o.x + 6, B - 65, 2.5, 3); c.fill();
        break;
      }
      case 'rope': {
        for (const px of [L + 3, R - 3]) {
          c.fillStyle = '#b8902f'; c.fillRect(px - 2, B - 34, 4, 32);
          c.fillStyle = '#e0b84a'; ell(c, px, B - 35, 4, 4); c.fill();
          c.fillStyle = '#8f6d1f'; ell(c, px, B - 2, 7, 2.6); c.fill();
        }
        c.strokeStyle = '#8c1d26'; c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(L + 3, B - 31); c.quadraticCurveTo(o.x, B - 14, R - 3, B - 31); c.stroke();
        break;
      }
      default: {
        c.fillStyle = '#333'; c.fillRect(L, T - 20, w, B - T + 20);
      }
    }
  }

  return { rr, ell, shadow, heart, jensen, spy, aide, paparazzi, chip, gpuBox, memo, slam, kiss, paper, obstacle };
})();
