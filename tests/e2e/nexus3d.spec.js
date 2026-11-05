// Los Nexus 3D (index.html). Sin GPU el navegador de pruebas dibuja ~2 cuadros por segundo,
// así que la lógica se avanza con el hook determinista `window.__nexus3d.step(segundos)`
// en vez de esperar tiempo real. Ver CONTEXTO.md §6.
import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

const step = (page, s) => page.evaluate((s) => window.__nexus3d.step(s), s);
const tp = async (page, x, z) => {
  await page.evaluate(([x, z]) => {
    const w = window.__nexus3d.world;
    w.nexus.position.set(x, 0, z);
    w.focus.set(x, 0, z);
  }, [x, z]);
  await step(page, 0.05);
};
const touch = async (page) => {
  await page.keyboard.press('KeyE');
  await step(page, 0.05);
};
const text = (page, id) => page.evaluate((id) => document.getElementById(id).textContent, id);
const mode = (page) => page.evaluate(() => document.body.className);

/**
 * Conecta dos cosas caminando hasta cada una. Las conexiones grandes abren la carrera de luz:
 * por defecto se recorre sola con el piloto automático (ride: false la deja abierta para probarla).
 */
async function connect(page, from, to, { ride = true } = {}) {
  await tp(page, ...from);
  await touch(page);
  await tp(page, ...to);
  await touch(page);
  if (ride && (await page.evaluate(() => window.__nexus3d.world.tunnelPending))) await rideTunnel(page, true);
}

/** Entra al túnel, toca EMPEZAR y lo recorre con el piloto automático (o sin manejar, para chocar). */
async function rideTunnel(page, steer, { backToWorld = true } = {}) {
  await expect.poll(() => mode(page)).toContain('mode-tunnel');
  await expect.poll(() => page.evaluate(() => window.__nexus3d.tunnel.state)).toMatch(/ready|failed/);
  await page.evaluate((steer) => (window.__nexus3d.tunnel.autopilot = steer), steer);
  await page.keyboard.press('Space');
  for (let i = 0; i < 220; i += 1) {
    const state = await page.evaluate((steer) => {
      const g = window.__nexus3d;
      // Sin manejar: la chispa se va contra la pared (en carreras fáciles sola podría llegar)
      if (!steer && g.tunnel.state === 'run') g.tunnel.offset.set(10, 0);
      g.step(0.1);
      return g.tunnel.state;
    }, steer);
    if (state === 'won' || state === 'failed') break;
  }
  if (steer && backToWorld) await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-world');
}

async function leaveMuseum(page) {
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-museum');
  await page.evaluate(() => document.getElementById('museumBack').click());
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-world');
}

async function collect(page, x, z) {
  await tp(page, x, z);
  await step(page, 1.3);
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.__errors = errors;
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await page.evaluate(() => document.getElementById('play').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
});

test.afterEach(async ({ page }) => {
  expect(page.__errors, 'sin errores de ejecución').toEqual([]);
});

test('3D: los cinco lugares, el museo y el progreso guardado', async ({ page }) => {
  test.setTimeout(240_000);
  expect(await text(page, 'msg')).toBe('El barrio está triste y sin color. Conecta la fuente con la farola');

  // Plaza: fuente → farola (túnel) → puerta
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  expect(await text(page, 'msg')).toContain('La farola se encendió');
  // La carrera de luz deja chispitas en la mochila
  expect(await page.evaluate(() => window.__nexus3d.world.charge)).toBeGreaterThan(0);
  await connect(page, [-14.3, -16.5], [-15.2, -25.6]);
  expect(await text(page, 'msg')).toContain('La plaza volvió a la vida');
  // El color vuelve alrededor de la plaza, pero no en el resto del barrio
  await step(page, 3);
  const life = await page.evaluate(() => {
    const w = window.__nexus3d.world;
    return { plaza: w.lifeAt(-18, -22), antena: w.lifeAt(22, -18) };
  });
  expect(life.plaza).toBeGreaterThan(0.95);
  expect(life.antena).toBeLessThan(0.05);
  await collect(page, -15.5, -24.2);
  await leaveMuseum(page);
  expect(await text(page, 'stars')).toBe('★ 1/7');

  // Fuente de agua
  await connect(page, [-27.2, 10.6], [-22.4, 13.2]);
  expect(await text(page, 'msg')).toContain('La fuente volvió a fluir');
  await collect(page, -20, 20.4);
  await leaveMuseum(page);

  // Antena: necesita dos fuentes distintas
  await connect(page, [16.3, -21.8], [26.2, -15.8]);
  expect(await text(page, 'msg')).toBe('La antena necesita otra conexión más');
  await connect(page, [16.3, -14.2], [26.2, -15.8]);
  expect(await text(page, 'msg')).toContain('La antena transmite');
  await collect(page, 30.5, -15.2);
  await leaveMuseum(page);

  // Puente: el canal bloquea hasta desplegarlo
  await tp(page, 18, 27.5);
  // Avanzar hacia el sur de a pasos chicos, como al caminar (un salto grande atravesaría el bloqueo)
  await page.evaluate(() => {
    const w = window.__nexus3d.world;
    for (let i = 0; i < 40; i += 1) {
      w.nexus.position.z += 0.3;
      w.world.resolve(w.nexus.position, 0.32);
    }
  });
  expect(await page.evaluate(() => window.__nexus3d.world.nexus.position.z)).toBeLessThan(30);
  await connect(page, [11.9, 24.6], [15.2, 26.5]);
  expect(await text(page, 'msg')).toContain('El puente se abrió');
  await step(page, 1.5);
  await page.evaluate(() => {
    const w = window.__nexus3d.world;
    w.nexus.position.set(18, 0, 28);
    for (let i = 0; i < 40; i += 1) {
      w.nexus.position.z += 0.3;
      w.world.resolve(w.nexus.position, 0.32);
    }
  });
  expect(await page.evaluate(() => window.__nexus3d.world.nexus.position.z)).toBeGreaterThan(36);
  await collect(page, 18, 40.5);
  await leaveMuseum(page);
  // Con cuatro de cinco lugares, lejos de las zonas sigue gris
  expect(await page.evaluate(() => window.__nexus3d.world.lifeAt(-40, 40))).toBeLessThan(0.05);

  // Jardín (al otro lado del canal): energía → aspersor → flores
  await connect(page, [0.3, 50.8], [-4.2, 53.4]);
  expect(await text(page, 'msg')).toContain('El aspersor despertó');
  await connect(page, [-4.2, 53.4], [-8.6, 54.2]);
  expect(await text(page, 'msg')).toContain('El jardín volvió a florecer');
  await collect(page, -13, 58.2);
  expect(await text(page, 'msg')).toBe('¡Fragmento recuperado!');
  await step(page, 4);
  // Con cinco de siete lugares (faltan el taller y los faroles), lejos de las zonas sigue gris
  expect(await page.evaluate(() => window.__nexus3d.world.lifeAt(-40, 40))).toBeLessThan(0.05);
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-museum');
  await expect(page.locator('#museumComplete')).toBeHidden();
  await leaveMuseum(page);

  // El fragmento secreto (detrás de la casa) no cuenta para la colección de zonas
  await collect(page, -18, -39.6);
  expect(await text(page, 'msg')).toBe('¡Encontraste un fragmento secreto!');
  await leaveMuseum(page);
  expect(await text(page, 'stars')).toBe('★ 5/7');

  // Recargar: Continuar restaura todo
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('#play')).toBeHidden();
  await page.evaluate(() => document.getElementById('continue').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
  expect(await text(page, 'msg')).toBe('Le devolviste la vida a 5 de 7 lugares — sigue explorando');
  expect(await text(page, 'stars')).toBe('★ 5/7');
});

test('3D: el señuelo no encaja y una conexión no se repite', async ({ page }) => {
  await connect(page, [22.6, -16.8], [26.2, -15.8]);
  expect(await text(page, 'toast')).toBe('Esa conexión no encaja, prueba otra');
  await connect(page, [16.3, -21.8], [26.2, -15.8]);
  expect(await text(page, 'msg')).toBe('La antena necesita otra conexión más');
  await connect(page, [16.3, -21.8], [26.2, -15.8]);
  expect(await text(page, 'toast')).toBe('¡Eso ya está conectado!');
  expect(await page.evaluate(() => window.__nexus3d.world.connections.all.find((o) => o.id === 'beacon').connectionCount)).toBe(1);
});

test('3D: el túnel tiene práctica, se puede reintentar ahí mismo o volver al barrio', async ({ page, isMobile }) => {
  await connect(page, [-22.6, -13.8], [-14.3, -16.5], { ride: false });
  await expect.poll(() => mode(page)).toContain('mode-tunnel');
  // Práctica: la chispa se mueve pero no avanza ni choca
  await expect(page.locator('#tunnelGo')).toHaveText('EMPEZAR');
  // En el celular el control táctil sigue disponible dentro del cable (y ocupa toda la pantalla)
  if (isMobile) {
    await expect(page.locator('#stickZone')).toBeVisible();
    const box = await page.locator('#stickZone').boundingBox();
    expect(box.width).toBeGreaterThan(500);
  }
  await page.keyboard.down('ArrowRight');
  await step(page, 3);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__nexus3d.tunnel.state)).toBe('ready');

  // Sin manejar: choca y ofrece reintentar
  await rideTunnel(page, false);
  expect(await page.evaluate(() => window.__nexus3d.tunnel.state)).toBe('failed');
  await expect(page.locator('#tunnelGo')).toHaveText('REINTENTAR');

  // Volver al barrio: sin castigo, se puede intentar otra vez
  await page.keyboard.press('Escape');
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-world');
  expect(await text(page, 'toast')).toContain('El cable quedó sin terminar');
  expect(await text(page, 'msg')).toBe('El barrio está triste y sin color. Conecta la fuente con la farola');

  // De nuevo: chocar, reintentar en el mismo túnel y ganar
  await connect(page, [-22.6, -13.8], [-14.3, -16.5], { ride: false });
  const first = await page.evaluate(() => window.__nexus3d.tunnel.current);
  await rideTunnel(page, false);
  await rideTunnel(page, true);
  expect(await text(page, 'msg')).toContain('La farola se encendió');

  // Cada carrera de luz sale distinta: otra forma que la anterior
  await connect(page, [-14.3, -16.5], [-15.2, -25.6], { ride: false });
  await expect.poll(() => mode(page)).toContain('mode-tunnel');
  const second = await page.evaluate(() => window.__nexus3d.tunnel.current);
  expect(second.shape).not.toBe(first.shape);
  expect(second.theme).toBe('Cable dorado');
  await rideTunnel(page, true);
  expect(await text(page, 'msg')).toContain('La plaza volvió a la vida');
});

test('3D: los vecinos hablan, recuerdan la visita y se alegran cuando su lugar revive', async ({ page }) => {
  const story = () => page.evaluate(() => (document.getElementById('story').hidden ? '' : document.getElementById('storyText').textContent));
  const happy = (id) => page.evaluate((id) => window.__nexus3d.world.residents.find((r) => r.id === id).targetHappy, id);
  await step(page, 0.1);
  expect(await story()).toContain('El barrio se quedó sin color');

  // Miga habla sola la primera vez que el Nexus se acerca
  expect(await happy('miga')).toBe(0);
  await tp(page, -17.5, -11.2);
  await step(page, 0.2);
  expect(await story()).toBe('El manual lo escribió un pato. Empecemos por dar luz a la plaza.');
  expect(await text(page, 'interact')).toBe('Hablar');

  // Restaurar la plaza: Miga cambia de frase y se pone contenta
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await connect(page, [-14.3, -16.5], [-15.2, -25.6]);
  await step(page, 1.5);
  expect(await happy('miga')).toBe(1);
  expect(await happy('bombo')).toBe(0);
  await tp(page, -17.5, -11.2);
  await touch(page);
  expect(await story()).toContain('Una puerta que abre');

  // La visita queda guardada
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('los-nexus-3d-progress')).heard)).toEqual(expect.arrayContaining(['intro', 'miga']));
});

test('3D: el jardín: la broma de Goteo, el aspersor que pasa el agua y las flores que reviven', async ({ page }) => {
  const story = () => page.evaluate(() => (document.getElementById('story').hidden ? '' : document.getElementById('storyText').textContent));
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Antes de regar, el aspersor apagado no puede iniciar un cable
  await tp(page, -4.2, 53.4);
  await touch(page);
  expect(await text(page, 'toast')).toBe('Primero toca algo que tenga energía');

  // Energía directo a las flores: broma del Alcalde (descubrimiento de la 2D)
  await connect(page, [0.3, 50.8], [-8.6, 54.2]);
  expect(await story()).toBe('¡No electrifiques la ensalada! Enciende el aspersor primero.');

  // Energía → aspersor → flores
  await connect(page, [0.3, 50.8], [-4.2, 53.4]);
  await connect(page, [-4.2, 53.4], [-8.6, 54.2]);
  await step(page, 3);
  const life = await page.evaluate(() => window.__nexus3d.world.lifeAt(-13, 54));
  expect(life).toBeGreaterThan(0.95);
  expect(await page.evaluate(() => window.__nexus3d.world.residents.find((r) => r.id === 'goteo').targetHappy)).toBe(1);

  // Al recargar, el jardín sigue florecido y el aspersor sigue andando
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  const restored = await page.evaluate(() => {
    const all = window.__nexus3d.world.connections.all;
    return [all.find((o) => o.id === 'garden-sprinkler').isActive, all.find((o) => o.id === 'garden-bed').isActive];
  });
  expect(restored).toEqual([true, true]);
});

test('3D: la mochila Atrapachispas: nidos, chispitas y cosas dormidas que se despiertan', async ({ page }) => {
  test.setTimeout(240_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const info = await w(() => {
    const wm = window.__nexus3d.world;
    const nests = wm.connections.all.filter((o) => o.id.startsWith('spark-')).map((s) => ({ id: s.id, x: s.x, z: s.z }));
    return { nests, sleepers: wm.sleepers.map((s) => ({ id: s.id, x: s.x, z: s.z })) };
  });
  expect(info.nests.length).toBe(6);
  expect(info.sleepers.length).toBe(27);
  expect(await text(page, 'awake')).toBe('✦ 0/27');
  expect(await text(page, 'charge')).toBe('🎒 ○○○○○');

  // Con la mochila vacía no se despierta nada
  const first = info.sleepers[0];
  await tp(page, first.x + 0.9, first.z + 0.9);
  await touch(page);
  expect(await text(page, 'toast')).toContain('mochila está vacía');
  expect(await w((id) => window.__nexus3d.world.connections.all.find((o) => o.id === id).isActive, first.id)).toBe(false);

  // Un nido suelta chispitas: se atrapan caminando cerca y van a la mochila
  const nest = info.nests[0];
  await tp(page, nest.x + 0.7, nest.z + 0.7);
  await touch(page);
  await step(page, 1.2);
  for (let i = 0; i < 6; i += 1) {
    const left = await w(() => window.__nexus3d.world.pickups.items.filter((p) => !p.id).map((p) => [p.pos.x, p.pos.z]));
    if (!left.length) break;
    await tp(page, left[0][0], left[0][1]);
    await step(page, 0.3);
  }
  expect(await w(() => window.__nexus3d.world.charge)).toBe(3);
  expect(await text(page, 'charge')).toBe('🎒 ●●●○○');
  // El nido quedó vacío por un rato
  await tp(page, nest.x + 0.7, nest.z + 0.7);
  await touch(page);
  expect(await text(page, 'toast')).toContain('volviendo a llenar');

  // Cada cosa dormida gasta una chispita; ya despierta, tocarla repite la reacción sin gastar
  let woken = 0;
  for (const sl of info.sleepers) {
    if ((await w(() => window.__nexus3d.world.charge)) === 0) await w(() => window.__nexus3d.world.setCharge(5));
    const duck = sl.id.includes('duck');
    const n = info.nests.reduce((a, b) => (Math.hypot(a.x - sl.x, a.z - sl.z) < Math.hypot(b.x - sl.x, b.z - sl.z) ? a : b));
    const dx = duck ? 1 : n.x - sl.x;
    const dz = duck ? 1 : n.z - sl.z;
    const d = Math.hypot(dx, dz) || 1;
    await tp(page, sl.x + (dx / d) * 0.9, sl.z + (dz / d) * 0.9);
    const before = await w(() => window.__nexus3d.world.charge);
    await touch(page);
    woken += 1;
    expect(await w((id) => window.__nexus3d.world.connections.all.find((o) => o.id === id).isActive, sl.id), `despierta ${sl.id}`).toBe(true);
    expect(await w(() => window.__nexus3d.world.charge)).toBe(before - 1);
    expect(await text(page, 'awake')).toBe(`✦ ${woken}/27`);
    if (woken === 1) {
      await touch(page);
      expect(await w(() => window.__nexus3d.world.charge)).toBe(before - 1);
    }
  }
  await step(page, 1.5);
  await expect.poll(() => text(page, 'msg')).toContain('todas las cosas');

  // Una chispita escondida se junta y no vuelve a aparecer
  const hidden = await w(() => window.__nexus3d.world.pickups.items.filter((p) => p.id?.startsWith('spark-hidden')).map((p) => [p.id, p.pos.x, p.pos.z]));
  expect(hidden.length).toBe(10);
  await w(() => window.__nexus3d.world.setCharge(0));
  await tp(page, hidden[0][1], hidden[0][2]);
  await step(page, 0.4);
  expect(await w(() => window.__nexus3d.world.charge)).toBe(1);

  // Todo queda guardado al continuar
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await page.evaluate(() => document.getElementById('continue').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
  expect(await text(page, 'awake')).toBe('✦ 27/27');
  expect(await text(page, 'charge')).toBe('🎒 ●○○○○');
  expect(await w(() => window.__nexus3d.world.pickups.items.filter((p) => p.id?.startsWith('spark-hidden')).length)).toBe(9);

  // La pelota de la plaza se patea al pasar corriendo
  const ball0 = await page.evaluate(() => window.__nexus3d.world.playground.balls[0].g.position.toArray());
  await tp(page, ball0[0] - 1.2, ball0[2]);
  // En la vista isométrica D + S camina hacia +X (directo hacia la pelota)
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 0.6);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  await step(page, 1.0);
  const ball1 = await page.evaluate(() => window.__nexus3d.world.playground.balls[0].g.position.toArray());
  expect(Math.hypot(ball1[0] - ball0[0], ball1[2] - ball0[2])).toBeGreaterThan(0.5);
});

test('3D: saltar al auto, tirolesa entre postes y bailar', async ({ page }) => {
  const w = (fn, arg) => page.evaluate(fn, arg);
  const y = () => w(() => window.__nexus3d.world.nexus.position.y);
  const setPos = (x, py, z) => w(([x, py, z]) => window.__nexus3d.world.nexus.position.set(x, py, z), [x, py, z]);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Saltar: desde la vereda al capó del auto (1,15 m) y desde ahí al techo (1,9 m), donde hay una chispita
  const car = await w(() => window.__nexus3d.world.world.carSpots[0]);
  const hoodX = car.x + Math.sin(car.rot) * 1.9;
  const hoodZ = car.z + Math.cos(car.rot) * 1.9;
  await tp(page, hoodX, car.z + 2.0);
  expect(await y()).toBe(0);
  await page.keyboard.press('Space');
  await step(page, 0.4); // cerca de lo más alto del salto (~1,28 m)
  expect(await y()).toBeGreaterThan(1.15);
  await setPos(hoodX, await y(), hoodZ);
  await step(page, 1.0);
  expect(await y()).toBeCloseTo(1.15, 2);
  // Sin saltar no se puede subir al techo: el techo empuja
  await page.keyboard.press('Space');
  await step(page, 0.35);
  await setPos(car.roofX, await y(), car.roofZ);
  await step(page, 1.0);
  expect(await y()).toBeCloseTo(1.9, 2);
  expect(await w(() => window.__nexus3d.world.charge)).toBe(1);
  // Bajar: al caminar fuera del auto cae al piso
  await setPos(car.roofX, 1.9, car.z + 3.5);
  await step(page, 1.0);
  expect(await y()).toBe(0);

  // Tirolesa: al lado de un poste el botón dice Tirolesa y el Nexus se desliza hasta el poste vecino
  const line = await w(() => window.__nexus3d.world.world.zipLines[0].map((p) => [p.x, p.z]));
  await tp(page, line[2][0] + 0.9, line[2][1] + 0.4);
  await w(() => (window.__nexus3d.world.nexus.heading = Math.PI / 2)); // mirando hacia +X
  await step(page, 0.1);
  expect(await text(page, 'interact')).toBe('Tirolesa');
  await touch(page);
  expect(await w(() => Boolean(window.__nexus3d.world.zip))).toBe(true);
  await step(page, 0.6);
  expect(await y()).toBeGreaterThan(4);
  await step(page, 3.5);
  expect(await w(() => window.__nexus3d.world.zip)).toBe(null);
  const end = await w(() => window.__nexus3d.world.nexus.position.toArray());
  expect(end[0]).toBeGreaterThan(line[3][0] - 2);
  expect(end[1]).toBe(0);
  // En el medio del cable había una chispita
  expect(await w(() => window.__nexus3d.world.charge)).toBe(2);

  // Bailar: el Nexus baila un rato y después sigue normal
  await page.keyboard.press('KeyB');
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.nexus.dancing)).toBe(true);
  await step(page, 3);
  expect(await w(() => window.__nexus3d.world.nexus.dancing)).toBe(false);
});

test('3D: menú de pausa, opciones, mapa y pista del objetivo', async ({ page }) => {
  const w = (fn, arg) => page.evaluate(fn, arg);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Tocar el objetivo da una pista con flecha en el piso
  await page.evaluate(() => document.getElementById('msg').click());
  await step(page, 0.1);
  expect(await text(page, 'storyWho')).toBe('Pista');
  expect(await text(page, 'storyText')).toContain('farola');
  expect(await w(() => window.__nexus3d.world.hintArrow.visible)).toBe(true);

  // Esc abre el menú y el mundo queda quieto
  await page.keyboard.press('Escape');
  await expect.poll(() => mode(page)).toContain('paused');
  const before = await w(() => window.__nexus3d.world.nexus.position.toArray());
  await page.keyboard.down('KeyW');
  await step(page, 0.5);
  await page.keyboard.up('KeyW');
  expect(await w(() => window.__nexus3d.world.nexus.position.toArray())).toEqual(before);

  // Opciones: efectos suaves y botones grandes se guardan aparte de la partida
  await page.evaluate(() => document.getElementById('mOptions').click());
  await page.evaluate(() => document.getElementById('optBig').click());
  expect(await mode(page)).toContain('big-buttons');
  expect(await w(() => localStorage.getItem('los-nexus-big-buttons'))).toBe('true');
  await page.evaluate(() => document.getElementById('optChase').click());
  expect(await w(() => window.__nexus3d.world.isIso)).toBe(false);
  await page.evaluate(() => document.getElementById('optChase').click());
  expect(await w(() => window.__nexus3d.world.isIso)).toBe(true);
  await page.evaluate(() => document.getElementById('optBack').click());

  // Mapa: se abre desde el menú y se dibuja
  await page.evaluate(() => document.getElementById('mMap').click());
  expect(await w(() => document.getElementById('mapPanel').hidden)).toBe(false);
  await expect
    .poll(() => w(() => {
      const c = document.getElementById('mapCanvas');
      const d = c.getContext('2d').getImageData(320, 320, 1, 1).data;
      return d[3];
    }))
    .toBe(255);
  await page.evaluate(() => document.getElementById('mapBack').click());
  expect(await mode(page)).not.toContain('paused');

  // Seguir jugando: el Nexus se vuelve a mover
  await page.keyboard.down('KeyW');
  await step(page, 0.5);
  await page.keyboard.up('KeyW');
  expect(await w(() => window.__nexus3d.world.nexus.position.toArray())).not.toEqual(before);
});

test('3D: la casa de Miga se visita y la calle del este llega al skatepark', async ({ page }) => {
  const w = (fn, arg) => page.evaluate(fn, arg);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Con la puerta cerrada no se puede entrar
  const door = await w(() => [window.__nexus3d.world.door.x, window.__nexus3d.world.door.z]);
  await tp(page, door[0], door[1] + 1.2);
  expect(await text(page, 'interact')).not.toBe('Entrar');

  // Plaza: fuente → farola → puerta
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await connect(page, [-14.3, -16.5], [-15.2, -25.6]);
  await tp(page, door[0], door[1] + 1.2);
  expect(await text(page, 'interact')).toBe('Entrar');
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  expect(await text(page, 'storyWho')).toContain('Miga');
  // Adentro las paredes son el límite
  const room = await w(() => window.__nexus3d.world.world.interior.room);
  await page.keyboard.down('KeyW');
  await step(page, 3);
  await page.keyboard.up('KeyW');
  const p = await w(() => window.__nexus3d.world.nexus.position.toArray());
  expect(p[0]).toBeGreaterThan(room.minX);
  expect(p[2]).toBeGreaterThan(room.minZ);

  // La chispita escondida está arriba del banco de trabajo: hay que saltar
  const spark = await w(() => window.__nexus3d.world.world.interior.spark);
  const charge0 = await w(() => window.__nexus3d.world.charge);
  await tp(page, spark.x, spark.z + 1.2);
  await page.keyboard.down('KeyW');
  await w(() => window.__nexus3d.world.jump());
  await step(page, 0.5);
  await page.keyboard.up('KeyW');
  await step(page, 1.5);
  expect(await w(() => window.__nexus3d.world.nexus.position.y)).toBeCloseTo(0.95, 1);
  expect(await w(() => window.__nexus3d.world.charge)).toBe(Math.min(5, charge0 + 1));

  // Salir por el felpudo
  const exit = await w(() => window.__nexus3d.world.world.interior.exit);
  await tp(page, exit.x, exit.z - 0.3);
  expect(await text(page, 'interact')).toBe('Salir');
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(false);
  const out = await w(() => window.__nexus3d.world.nexus.position.toArray());
  expect(Math.hypot(out[0] - door[0], out[2] - door[1])).toBeLessThan(2.5);

  // El camino del este sigue hasta el portón (y no más allá); fuera de la calle no se pasa
  await tp(page, 44, 0);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 4);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  const end = await w(() => window.__nexus3d.world.nexus.position.toArray());
  expect(end[0]).toBeGreaterThan(55);
  expect(Math.abs(end[2])).toBeLessThan(6.5);
  expect(await text(page, 'districtBanner')).toContain('Skatepark');
  await tp(page, 43, -20);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 2);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  expect(await w(() => window.__nexus3d.world.nexus.position.x)).toBeLessThanOrEqual(45);
});

test('3D: skatepark — patineta, trucos de Rulo, capucha, Mundo Voltio, Chispi y circuito', async ({ page }) => {
  test.setTimeout(300_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const flag = (f) => w((f) => window.__nexus3d.world.progress.hasFlag(f), f);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Por la calle del este se llega caminando al Skatepark
  await tp(page, 56, 0);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 2.2);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  expect(await w(() => window.__nexus3d.world.nexus.position.x)).toBeGreaterThan(62);
  await step(page, 0.6);
  expect(await text(page, 'districtBanner')).toContain('Skatepark');
  expect(await text(page, 'msg')).toContain('Rulo');

  // La patineta de Rulo
  const board = await w(() => window.__nexus3d.world.world.skate.board);
  await tp(page, board.x - 0.8, board.z + 0.4);
  expect(await text(page, 'interact')).toBe('Patineta');
  await touch(page);
  expect(await w(() => window.__nexus3d.world.riding)).toBe(true);
  expect(await flag('board')).toBe(true);
  // Andar en patineta es más rápido que caminar
  await tp(page, 66, 0);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 1.6);
  expect(await w(() => window.__nexus3d.world.nexus.speed)).toBeGreaterThan(6);
  // Truco 1: ollie
  await page.keyboard.press('Space');
  await step(page, 0.1);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  await step(page, 1);
  expect(await flag('trick-ollie')).toBe(true);

  // Truco 2: volar en la rampita
  const k = await w(() => window.__nexus3d.world.world.skate.kickers[0]);
  await w(([x, z]) => {
    const g = window.__nexus3d.world;
    g.nexus.position.set(x - 3, 0, z);
    g.nexus.heading = Math.PI / 2;
    g.skate.speed = 8;
  }, [k.x, k.z]);
  await step(page, 0.5);
  expect(await flag('trick-air')).toBe(true);
  await step(page, 1.5);

  // Truco 3: grind en la baranda (cayendo sobre ella a lo largo)
  const r = await w(() => window.__nexus3d.world.world.skate.rails[0]);
  await w(([x, z, h]) => {
    const g = window.__nexus3d.world;
    g.nexus.position.set(x + 2, h + 0.4, z);
    g.nexus.heading = Math.PI / 2;
    g.skate.speed = 7;
    g.grounded = false;
    g.vy = -1;
  }, [r.ax, r.az, r.h]);
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.skate.grinding)).toBe(true);
  expect(await flag('trick-grind')).toBe(true);
  await step(page, 2.5);
  expect(await w(() => window.__nexus3d.world.skate.grinding)).toBe(false);

  // Los tres trucos destraban la capucha
  expect(await flag('hood')).toBe(true);
  expect(await mode(page)).toContain('has-hood');
  await page.keyboard.press('KeyE'); // bajarse
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.riding)).toBe(false);

  // Mundo Voltio
  const sk = await w(() => {
    const s = window.__nexus3d.world.world.skate;
    return { chispi: s.chispi, nodes: s.nodes, door: [s.sala.doorX, s.sala.doorZ] };
  });
  // Las Estáticas se van lejos para que no molesten (después se prueba que tocan)
  const parkStatics = () =>
    w(() => window.__nexus3d.world.voltio.statics.forEach((s) => Object.assign(s, { x: 93, z: 11, tx: 93, tz: 11 })));
  await tp(page, sk.chispi.x - 5, sk.chispi.z);
  await page.keyboard.press('KeyQ');
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.voltioActive)).toBe(true);
  expect(await mode(page)).toContain('voltio');
  expect(await text(page, 'storyWho')).toBe('Voltio');
  await page.evaluate(() => document.getElementById('story').click());
  await parkStatics();

  // Rescatar al Chispi: dar una vuelta completa alrededor de la jaula con la estela
  for (let i = 0; i <= 22; i += 1) {
    const a = (i / 20) * Math.PI * 2 + Math.PI;
    await tp(page, sk.chispi.x + Math.cos(a) * 2.6, sk.chispi.z + Math.sin(a) * 2.6);
  }
  expect(await w(() => window.__nexus3d.world.progress.hasChispi('rueditas'))).toBe(true);
  await expect.poll(() => w(() => document.getElementById('cardPop').hidden)).toBe(false);
  expect(await text(page, 'cardName')).toBe('Rueditas');
  await page.evaluate(() => document.getElementById('cardOk').click());
  expect(await mode(page)).not.toContain('paused');

  // Circuito: tocar los tres nodos abre la sala del skatepark
  await parkStatics();
  for (const n of sk.nodes) await tp(page, n.x, n.z);
  await step(page, 0.1);
  expect(await flag('sala-open')).toBe(true);
  expect(await text(page, 'msg')).toContain('Circuito cerrado');

  // Una Estática que toca al Nexus lo saca del Mundo Voltio
  const st = await w(() => window.__nexus3d.world.voltio.staticSpots[0]);
  await tp(page, st.x, st.z);
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.voltioActive)).toBe(false);
  expect(await text(page, 'msg')).toContain('Bzzzt');

  // La sala ya se puede visitar
  await tp(page, sk.door[0], sk.door[1] + 1.4);
  expect(await text(page, 'interact')).toBe('Entrar');
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  expect(await text(page, 'storyWho')).toContain('Rulo');
  const exit = await w(() => window.__nexus3d.world.world.skate.room.exit);
  await tp(page, exit.x, exit.z - 0.3);
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(false);

  // La rampa grande revive con su carrera de luz (tema grafiti) y Rulo se alegra
  const src = await w(() => window.__nexus3d.world.world.skate.source);
  const ramp = await w(() => window.__nexus3d.world.world.skate.ramp);
  await connect(page, [src.x + 1, src.z], [ramp.x, ramp.z + 1]);
  expect(await w(() => window.__nexus3d.world.connections.all.find((o) => o.id === 'skate-ramp').isActive)).toBe(true);
  await step(page, 3);
  expect(await w(() => window.__nexus3d.world.lifeAt(80, 0))).toBeGreaterThan(0.5);

  // El voltaje se acaba y vuelve solo al mundo normal
  await tp(page, 70, 10);
  await page.keyboard.press('KeyQ');
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.voltioActive)).toBe(true);
  await parkStatics();
  await step(page, 31);
  expect(await w(() => window.__nexus3d.world.voltioActive)).toBe(false);

  // Todo queda guardado
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  const saved = await w(() => {
    const p = window.__nexus3d.world.progress;
    return [p.hasFlag('board'), p.hasFlag('hood'), p.hasFlag('sala-open'), p.hasChispi('rueditas')];
  });
  expect(saved).toEqual([true, true, true, true]);
});

test('3D: interiores — heladería, casa de Miga y tienda de cartas se reviven y se nota desde afuera', async ({ page }) => {
  test.setTimeout(300_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());
  const enterAt = async (door) => {
    await tp(page, door.x, door.z + 1.0);
    expect(await text(page, 'interact')).toBe('Entrar');
    await touch(page);
    await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  };
  const leave = async (room) => {
    const exit = await w((r) => window.__nexus3d.world.world[r].exit, room);
    await tp(page, exit.x, exit.z - 0.3);
    expect(await text(page, 'interact')).toBe('Salir');
    await touch(page);
    await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(false);
  };
  const revive = async (room) => {
    const r = await w((r) => ({ s: window.__nexus3d.world.world[r].source, t: window.__nexus3d.world.world[r].target }), room);
    expect(await w((r) => window.__nexus3d.world.world[r].gray.alive, room)).toBe(false);
    // El objetivo adentro dice qué revivir (cuando se apaga el último aviso)
    await step(page, 5.5);
    expect(await text(page, 'msg')).toContain('Llevá la energía');
    await connect(page, [r.s.x + 0.9, r.s.z], [r.t.x + (room === 'interior' ? 1.2 : 0), r.t.z + (room === 'interior' ? 0 : 1.4)]);
    expect(await w((r) => window.__nexus3d.world.world[r].gray.alive, room)).toBe(true);
  };
  const doors = await w(() => window.__nexus3d.world.world.shopDoors);

  // Heladería: abierta desde el principio, gris adentro hasta prender la máquina de helados
  await enterAt(doors.helados);
  expect(await text(page, 'storyWho')).toBe('Heladería');
  await revive('heladeria');
  expect(await text(page, 'msg')).toContain('heladería volvió');
  await leave('heladeria');
  expect(await w(() => window.__nexus3d.world.world.outside.helados.material.opacity)).toBeGreaterThan(0.5);

  // Casa de Miga: se abre con la plaza; adentro se prende el tablero de luz y afuera aparece la guirnalda
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await connect(page, [-14.3, -16.5], [-15.2, -25.6]);
  const door = await w(() => [window.__nexus3d.world.door.x, window.__nexus3d.world.door.z]);
  await tp(page, door[0], door[1] + 1.2);
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  expect(await w(() => window.__nexus3d.world.world.outside.miga.visible)).toBe(false);
  await revive('interior');
  await leave('interior');
  expect(await w(() => window.__nexus3d.world.world.outside.miga.visible)).toBe(true);

  // Tienda de cartas: cerrada hasta cerrar su circuito en el Mundo Voltio
  await tp(page, doors.cartas.x, doors.cartas.z + 1.0);
  expect(await text(page, 'interact')).not.toBe('Entrar');
  await w(() => {
    window.__nexus3d.world.progress.setFlag('hood');
    document.body.classList.add('has-hood');
  });
  await page.keyboard.press('KeyQ');
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.voltioActive)).toBe(true);
  await page.evaluate(() => document.getElementById('story').click());
  expect(await text(page, 'msg')).toContain('tienda de cartas');
  const nodes = await w(() => window.__nexus3d.world.world.cardNodes);
  for (const n of nodes) await tp(page, n.x, n.z);
  await step(page, 0.1);
  expect(await w(() => window.__nexus3d.world.progress.hasFlag('cartas-open'))).toBe(true);
  await page.keyboard.press('KeyQ');
  await step(page, 1.2);
  expect(await w(() => window.__nexus3d.world.world.outside.grille.position.y)).toBeGreaterThan(2);
  await enterAt(doors.cartas);
  await revive('tienda');
  await leave('tienda');
  expect(await w(() => window.__nexus3d.world.world.outside.cartas.material.opacity)).toBeGreaterThan(0.5);

  // Al recargar, todo sigue revivido
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  const alive = await w(() => ['interior', 'heladeria', 'tienda'].map((r) => window.__nexus3d.world.world[r].gray.alive));
  expect(alive).toEqual([true, true, true]);
  expect(await w(() => window.__nexus3d.world.world.outside.miga.visible)).toBe(true);
});

test('3D: cartas de Chispis — sobres, rescates en Voltio, cambios con vecinos y álbum', async ({ page }) => {
  test.setTimeout(300_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const unique = () => w(() => window.__nexus3d.world.progress.uniqueCards);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());
  expect(await text(page, 'cards')).toBe('🃏 0/40');

  // Sobre escondido: al pasar por encima se abren tres cartas, de a una y en orden
  const pack = await w(() => window.__nexus3d.world.packSpots.find((p) => p.id === 'banco-plaza'));
  await tp(page, pack.x, pack.z);
  await step(page, 0.1);
  await expect.poll(() => w(() => document.getElementById('packPop').hidden)).toBe(false);
  expect(await mode(page)).toContain('paused');
  expect(await page.locator('.flip-card').count()).toBe(3);
  // La última (la más rara) no se da vuelta antes que las otras
  await page.locator('.flip-card').nth(2).click();
  expect(await page.locator('.flip-card.open').count()).toBe(0);
  for (let i = 0; i < 3; i += 1) await page.locator('.flip-card').nth(i).click();
  expect(await page.locator('.flip-card.open').count()).toBe(3);
  const rarities = await page.$$eval('.flip-card', (els) => els.map((e) => e.className.match(/rare-(\w+)/)[1]));
  expect(rarities[2]).not.toBe('comun');
  await page.locator('#packOk').click();
  expect(await mode(page)).not.toContain('paused');
  expect(await unique()).toBeGreaterThanOrEqual(2);
  expect(await text(page, 'cards')).toContain(`🃏 ${await unique()}/40`);
  // El sobre ya no está
  expect(await w(() => window.__nexus3d.world.packSpots.some((p) => p.id === 'banco-plaza'))).toBe(false);

  // Revivir un lugar deja un sobre al lado
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await connect(page, [-14.3, -16.5], [-15.2, -25.6]);
  await step(page, 1.5);
  expect(await w(() => window.__nexus3d.world.packSpots.some((p) => p.id === 'lugar-plaza'))).toBe(true);

  // Rescate en el Mundo Voltio: Chispazo, en el Centro
  await w(() => {
    const p = window.__nexus3d.world.progress;
    p.setFlag('hood');
    p.setFlag('voltio-seen');
    document.body.classList.add('has-hood');
  });
  const cage = await w(() => window.__nexus3d.world.voltio.cageSpots.find((c) => c.id === 'chispazo'));
  await tp(page, cage.x - 3, cage.z);
  await page.keyboard.press('KeyQ');
  await step(page, 0.1);
  expect(await text(page, 'msg')).toContain('Chispazo');
  for (let i = 0; i <= 22; i += 1) {
    const a = (i / 20) * Math.PI * 2 + Math.PI;
    await tp(page, cage.x + Math.cos(a) * 2.6, cage.z + Math.sin(a) * 2.6);
  }
  expect(await w(() => window.__nexus3d.world.progress.hasCard('chispazo'))).toBe(true);
  await expect.poll(() => w(() => document.getElementById('cardPop').hidden)).toBe(false);
  expect(await text(page, 'cardName')).toBe('Chispazo');
  await page.locator('#cardOk').click();
  await page.keyboard.press('KeyQ');
  await step(page, 0.3);

  // Cambio con Miga: sin repetidas avisa; con una repetida, ofrece su Tuerquín
  await tp(page, -16.5, -11.4);
  await w(() => {
    const p = window.__nexus3d.world.progress;
    for (const id of Object.keys(p.state.cards)) p.state.cards[id] = 1;
  });
  await step(page, 0.2);
  await expect.poll(() => text(page, 'interact')).toBe('Hablar');
  await touch(page);
  await expect.poll(() => text(page, 'storyText')).toContain('carta repetida');
  await w(() => window.__nexus3d.world.progress.addCard('chispazo'));
  await touch(page);
  await expect.poll(() => w(() => document.getElementById('tradePop').hidden)).toBe(false);
  await page.locator('#tradeDups button').first().click();
  expect(await w(() => window.__nexus3d.world.progress.hasCard('tuerquin'))).toBe(true);
  expect(await w(() => window.__nexus3d.world.progress.cardCount('chispazo'))).toBe(1);
  expect(await text(page, 'cardName')).toBe('Tuerquín');
  await page.locator('#cardOk').click();

  // Álbum: desde el menú, con sombras para las que faltan y las que tiene a color
  await page.locator('#menuBtn').click();
  await page.locator('#mAlbum').click();
  expect(await w(() => document.getElementById('albumPop').hidden)).toBe(false);
  expect(await page.locator('#albumGrid .mini-card').count()).toBe(40);
  const owned = await unique();
  expect(await page.locator('#albumGrid .mini-card.missing').count()).toBe(40 - owned);
  expect(await text(page, 'albumCount')).toContain(`${owned} / 40`);
  await page.locator('#albumGrid .mini-card[data-card="tuerquin"]').click();
  expect(await text(page, 'cardName')).toBe('Tuerquín');
  await page.locator('#cardOk').click();
  await page.locator('#albumBack').click();
  expect(await mode(page)).not.toContain('paused');

  // Todo queda guardado
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  expect(await unique()).toBe(owned);
  expect(await w(() => window.__nexus3d.world.packSpots.some((p) => p.id === 'banco-plaza'))).toBe(false);
  expect(await w(() => window.__nexus3d.world.voltio.isCaged('chispazo'))).toBe(false);
});

test('3D: Chispi compañero — se elige en el álbum, sigue al Nexus y cada tipo ayuda', async ({ page }) => {
  test.setTimeout(240_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const choose = (id) => w((id) => window.__nexus3d.world.setCompanion(id, false), id);
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());
  await w(() => {
    const p = window.__nexus3d.world.progress;
    for (const id of ['hojin', 'chispazo', 'turbochispa', 'gotita', 'olita', 'ondita', 'pochoclin']) p.addCard(id);
  });

  // Se elige desde la carta del álbum y aparece al lado del Nexus
  await page.locator('#menuBtn').click();
  await page.locator('#mAlbum').click();
  await page.locator('#albumGrid .mini-card[data-card="hojin"]').click();
  await expect(page.locator('#cardBuddy')).toHaveText('⭐ Elegir de compañero');
  await page.locator('#cardBuddy').click();
  await expect(page.locator('#cardBuddy')).toHaveText('⭐ Es tu compañero');
  expect(await page.locator('#albumGrid .mini-card.is-buddy').getAttribute('data-card')).toBe('hojin');
  await page.locator('#cardOk').click();
  await page.locator('#albumBack').click();
  expect(await w(() => window.__nexus3d.world.companionId)).toBe('hojin');
  expect(await text(page, 'buddy')).toContain('Hojín');

  // Sigue al Nexus al caminar
  await tp(page, -20, -11);
  await page.keyboard.down('KeyD');
  await step(page, 2);
  await page.keyboard.up('KeyD');
  await step(page, 1);
  const gap = await w(() => {
    const g = window.__nexus3d.world;
    return Math.hypot(g.companion.position.x - g.nexus.position.x, g.companion.position.z - g.nexus.position.z);
  });
  expect(gap).toBeLessThan(2.2);

  // Bosque: salta más alto (más de 1,5 m; sin ayudita, ~1,28 m)
  const peak = async () => {
    await tp(page, -20, -8);
    await w(() => window.__nexus3d.world.jump());
    let top = 0;
    for (let i = 0; i < 12; i += 1) {
      await step(page, 0.05);
      top = Math.max(top, await w(() => window.__nexus3d.world.nexus.position.y));
    }
    await step(page, 1);
    return top;
  };
  expect(await peak()).toBeGreaterThan(1.5);
  await choose(null);
  expect(await peak()).toBeLessThan(1.4);

  // Luz: imán más grande para las chispitas
  await choose('chispazo');
  expect(await w(() => window.__nexus3d.world.pickups.magnet)).toBeGreaterThan(3);
  // Mar: más voltaje en el Mundo Voltio
  await choose('olita');
  expect(await w(() => window.__nexus3d.world.voltio.maxVolt)).toBe(45);
  expect(await w(() => window.__nexus3d.world.pickups.magnet)).toBe(1.4);
  // Agua: pisar un charco da un impulso
  await choose('gotita');
  await tp(page, -11, -3.5);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 0.9);
  expect(await w(() => window.__nexus3d.world.nexus.speedScale)).toBeGreaterThan(1.4);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  // Ruedas: más velocidad en patineta
  await choose('turbochispa');
  await w(() => window.__nexus3d.world.progress.setFlag('board'));
  await tp(page, 63, -9);
  await w(() => window.__nexus3d.world.mount());
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  let top = 0;
  for (let i = 0; i < 10; i += 1) {
    await step(page, 0.25);
    top = Math.max(top, await w(() => window.__nexus3d.world.nexus.speed));
  }
  expect(top).toBeGreaterThan(9.5);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  await w(() => window.__nexus3d.world.dismount());
  // Radio: escucha un sobre cercano y vuela a mostrarlo
  await choose('ondita');
  const pack = await w(() => window.__nexus3d.world.packSpots.find((p) => p.id === 'callejon'));
  await tp(page, pack.x + 8, pack.z);
  let scouted = false;
  for (let i = 0; i < 16 && !scouted; i += 1) {
    await step(page, 0.5);
    scouted = await w(() => window.__nexus3d.world.companion.scouting);
  }
  expect(scouted).toBe(true);
  expect(await text(page, 'toast')).toContain('escucha un sobre');

  // Se guarda
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  expect(await w(() => window.__nexus3d.world.companionId)).toBe('ondita');
});

test('3D: el Centro completo — taller de Pipa, faroles de Lucio y la fiesta final', async ({ page }) => {
  test.setTimeout(360_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const active = (id) => w((id) => window.__nexus3d.world.connections.all.find((o) => o.id === id).isActive, id);
  const at = (id) => w((id) => { const o = window.__nexus3d.world.connections.all.find((k) => k.id === id); return [o.x, o.z]; }, id);
  const near = async (id, dx = 0.9, dz = 0.9) => { const [x, z] = await at(id); return [x + dx, z + dz]; };
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Los cinco primeros lugares ya resueltos (como una partida guardada)
  await w(() => {
    const p = window.__nexus3d.world.progress;
    for (const [s, t] of [
      ['energy-source', 'lamp'], ['lamp', 'door'], ['fountain-source', 'fountain'], ['beacon-source-a', 'beacon'],
      ['beacon-source-b', 'beacon'], ['bridge-source', 'bridge'], ['garden-source', 'garden-sprinkler'], ['garden-sprinkler', 'garden-bed'],
    ]) p.saveConnection(s, t);
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await page.evaluate(() => document.getElementById('continue').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
  expect(await text(page, 'stars')).toContain('/7');

  // La fiesta no se puede armar sin el desfile
  // (primero los faroles: energía → inicio → curioso → tímido → salida)
  await connect(page, await near('lantern-source'), await near('lantern-first', 0.6, 0.6));
  expect(await active('lantern-first')).toBe(true);
  await connect(page, await near('lantern-first', 0.6, 0.6), await near('lantern-side-a', 0.6, 0.6));
  await connect(page, await near('lantern-side-a', 0.6, 0.6), await near('lantern-side-b', 0.6, -0.6));
  await step(page, 1);
  expect(await text(page, 'storyWho')).toBe('El farol tímido');
  await connect(page, await near('lantern-side-b', 0.6, -0.6), await near('lantern-last', 0.6, 0.6));
  expect(await active('lantern-last')).toBe(true);
  expect(await text(page, 'msg')).toContain('Tenemos camino');
  await connect(page, await near('lantern-last', 0.6, 0.6), [32.5, 61]);
  expect(await active('party-stage')).toBe(false);
  expect(await text(page, 'toast')).toContain('Faltan preparativos');

  // Taller de Pipa: entrar, motor (carrera de luz), pato y campana, desfile
  const door = await w(() => {
    const W = { x: 41.5, z: 51.5 + 2.5 + 1.0 };
    return W;
  });
  await tp(page, door.x, door.z);
  expect(await text(page, 'interact')).toBe('Entrar');
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  expect(await text(page, 'storyWho')).toContain('Pipa');
  await connect(page, await near('toy-source'), await near('toy-motor', 1.2, 1.2));
  expect(await active('toy-motor')).toBe(true);
  await connect(page, await near('toy-motor', 1.2, 1.2), await near('toy-duck', 0, 0.8));
  await connect(page, await near('toy-motor', 1.2, 1.2), await near('toy-bell', 0, 0.8));
  await connect(page, await near('toy-duck', 0, 0.8), await near('toy-parade', 0, 1.4));
  expect(await active('toy-parade')).toBe(false);
  expect(await text(page, 'msg')).toContain('las dos cosas');
  await connect(page, await near('toy-bell', 0, 0.8), await near('toy-parade', 0, 1.4));
  expect(await active('toy-parade')).toBe(true);
  expect(await w(() => window.__nexus3d.world.world.taller.gray.alive)).toBe(true);
  const exit = await w(() => window.__nexus3d.world.world.taller.exit);
  await tp(page, exit.x, exit.z - 0.3);
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(false);
  expect(await text(page, 'stars')).toBe('★ 0/7');

  // Ahora sí: salida → escenario (carrera de luz) → confeti = ¡fiesta!
  await connect(page, await near('lantern-last', 0.6, 0.6), [32.5, 61]);
  expect(await active('party-stage')).toBe(true);
  await connect(page, [32.5, 61], await near('party-confetti', -0.9, 0.6));
  expect(await active('party-confetti')).toBe(true);
  expect(await w(() => window.__nexus3d.world.chapterDone)).toBe(true);
  await step(page, 3.6);
  await expect.poll(() => w(() => document.getElementById('endPop').hidden), { timeout: 15_000 }).toBe(false);
  expect(await page.locator('#endStats li').count()).toBe(4);
  expect(await text(page, 'endStats')).toContain('7/7');
  await page.locator('#endOk').click();
  expect(await mode(page)).not.toContain('paused');
  // Con los siete lugares, el color vuelve a todo el pueblo
  await step(page, 4);
  expect(await w(() => window.__nexus3d.world.lifeAt(-40, 40))).toBeGreaterThan(0.99);

  // Los vecinos ya dicen su epílogo
  await tp(page, 11.5, 59.4);
  await step(page, 0.2);
  await expect.poll(() => text(page, 'interact')).toBe('Hablar');
  await touch(page);
  expect(await text(page, 'storyText')).toContain('La fiesta sigue');

  // Se guarda: al recargar, el capítulo sigue terminado y no se repite la pantalla final
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  expect(await w(() => window.__nexus3d.world.chapterDone)).toBe(true);
  expect(await active('party-confetti')).toBe(true);
  expect(await w(() => document.getElementById('endPop').hidden)).toBe(true);
});

test('3D: Parque de diversiones — calesita, motores en el Mundo Voltio, vuelta al mundo y montaña rusa', async ({ page }) => {
  test.setTimeout(360_000);
  const w = (fn, arg) => page.evaluate(fn, arg);
  const active = (id) => w((id) => window.__nexus3d.world.connections.all.find((o) => o.id === id).isActive, id);
  const at = (id) => w((id) => { const o = window.__nexus3d.world.connections.all.find((k) => k.id === id); return [o.x, o.z]; }, id);
  const near = async (id, dx = 0.9, dz = 0.9) => { const [x, z] = await at(id); return [x + dx, z + dz]; };
  await step(page, 0.1);
  await page.evaluate(() => document.getElementById('story').click());

  // Se llega caminando por la calle norte-sur
  await tp(page, 0, -40);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await step(page, 3);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  expect(await w(() => window.__nexus3d.world.nexus.position.z)).toBeLessThan(-50);
  await step(page, 0.6);
  expect(await text(page, 'districtBanner')).toContain('Parque');
  expect(await text(page, 'msg')).toContain('calesita');

  // Calesita: cable desde la energía (carrera de luz) y subirse
  await connect(page, await near('park-carousel-source'), await near('park-carousel', 4.2, 4.2));
  expect(await active('park-carousel')).toBe(true);
  const board = await w(() => window.__nexus3d.world.carousel.boardAt);
  await tp(page, board.x, board.z);
  expect(await text(page, 'interact')).toBe('🎠 Subir');
  await touch(page);
  expect(await w(() => window.__nexus3d.world.onRide)).toBe('park-carousel');
  const p0 = await w(() => window.__nexus3d.world.nexus.position.toArray());
  await step(page, 1.5);
  const p1 = await w(() => window.__nexus3d.world.nexus.position.toArray());
  expect(Math.hypot(p1[0] - p0[0], p1[2] - p0[2])).toBeGreaterThan(0.5); // gira con la calesita
  expect(p1[1]).toBeGreaterThan(0.8); // arriba del caballito
  expect(await text(page, 'interact')).toBe('Bajar');
  await touch(page);
  expect(await w(() => window.__nexus3d.world.onRide)).toBe(null);

  // La vuelta al mundo tiene el motor trabado
  await connect(page, await near('park-wheel-source'), await near('park-wheel', 0, 3.4));
  expect(await active('park-wheel')).toBe(false);
  expect(await text(page, 'toast')).toContain('motor trabado');

  // Mundo Voltio: los dos circuitos del parque destraban los motores
  await w(() => {
    const p = window.__nexus3d.world.progress;
    p.setFlag('hood');
    p.setFlag('voltio-seen');
    document.body.classList.add('has-hood');
  });
  await page.keyboard.press('KeyQ');
  await step(page, 0.1);
  expect(await text(page, 'msg')).toContain('vuelta al mundo');
  const nodes = await w(() => {
    const v = window.__nexus3d.world.voltio;
    return v.nodes.filter((n) => n.circuit === 'wheel-open' || n.circuit === 'coaster-open').map((n) => [n.x, n.z]);
  });
  expect(nodes.length).toBe(6);
  for (const [x, z] of nodes) await tp(page, x, z);
  await step(page, 0.1);
  expect(await w(() => [window.__nexus3d.world.wheel.unlocked, window.__nexus3d.world.coaster.unlocked])).toEqual([true, true]);
  await page.keyboard.press('KeyQ');
  await step(page, 0.3);

  // Vuelta al mundo: revive y sube alto
  await connect(page, await near('park-wheel-source'), await near('park-wheel', 0, 3.4));
  expect(await active('park-wheel')).toBe(true);
  const wb = await w(() => window.__nexus3d.world.wheel.boardAt);
  await tp(page, wb.x, wb.z);
  await touch(page);
  expect(await w(() => window.__nexus3d.world.onRide)).toBe('park-wheel');
  let top = 0;
  for (let i = 0; i < 20; i += 1) {
    await step(page, 0.5);
    top = Math.max(top, await w(() => window.__nexus3d.world.nexus.position.y));
  }
  expect(top).toBeGreaterThan(8);
  await touch(page);
  expect(await w(() => window.__nexus3d.world.nexus.position.y)).toBe(0);

  // Montaña rusa: revive, da una vuelta sola y junta chispitas de la vía
  await connect(page, await near('park-coaster-source'), await near('park-coaster', 2.2, 2.2));
  expect(await active('park-coaster')).toBe(true);
  await w(() => window.__nexus3d.world.setCharge(0));
  const cb = await w(() => window.__nexus3d.world.coaster.boardAt);
  await tp(page, cb.x, cb.z);
  await touch(page);
  expect(await w(() => window.__nexus3d.world.onRide)).toBe('park-coaster');
  let high = 0;
  for (let i = 0; i < 60 && (await w(() => window.__nexus3d.world.onRide)); i += 1) {
    await step(page, 0.25);
    high = Math.max(high, await w(() => window.__nexus3d.world.nexus.position.y));
  }
  expect(await w(() => window.__nexus3d.world.onRide)).toBe(null);
  expect(high).toBeGreaterThan(6);
  expect(await w(() => window.__nexus3d.world.charge)).toBeGreaterThanOrEqual(3);

  // Con los tres juegos, el parque revive y Tita se alegra
  expect(await w(() => window.__nexus3d.world.parkDone)).toBe(3);
  await step(page, 3);
  expect(await w(() => window.__nexus3d.world.lifeAt(0, -73))).toBeGreaterThan(0.9);

  // Casa de los espejos: entrar y revivir la bola de espejos
  await tp(page, 25.5, -54.6);
  expect(await text(page, 'interact')).toBe('Entrar');
  await touch(page);
  await expect.poll(() => w(() => window.__nexus3d.world.isInside)).toBe(true);
  const room = await w(() => ({ s: window.__nexus3d.world.world.espejos.source, t: window.__nexus3d.world.world.espejos.target }));
  await connect(page, [room.s.x + 0.9, room.s.z], [room.t.x + 0.9, room.t.z + 0.9]);
  expect(await w(() => window.__nexus3d.world.world.espejos.gray.alive)).toBe(true);

  // Se guarda
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  expect(await w(() => window.__nexus3d.world.parkDone)).toBe(3);
  expect(await w(() => [window.__nexus3d.world.wheel.unlocked, window.__nexus3d.world.coaster.unlocked])).toEqual([true, true]);
});
