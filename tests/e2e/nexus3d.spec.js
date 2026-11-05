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
  expect(await text(page, 'stars')).toBe('★ 1/5');

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
  expect(await text(page, 'msg')).toBe('¡El barrio entero volvió a la vida!');
  await step(page, 4);
  // Con los cinco lugares, el color vuelve a todo el pueblo (también lejos de las zonas)
  expect(await page.evaluate(() => window.__nexus3d.world.lifeAt(-40, 40))).toBeGreaterThan(0.99);
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-museum');
  await expect(page.locator('#museumComplete')).toBeVisible();
  await leaveMuseum(page);

  // El fragmento secreto (detrás de la casa) no cuenta para la colección de zonas
  await collect(page, -18, -39.6);
  expect(await text(page, 'msg')).toBe('¡Encontraste un fragmento secreto!');
  await leaveMuseum(page);
  expect(await text(page, 'stars')).toBe('★ 5/5');

  // Recargar: Continuar restaura todo
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('#play')).toBeHidden();
  await page.evaluate(() => document.getElementById('continue').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
  expect(await text(page, 'msg')).toBe('Ya le devolviste la vida a todo el barrio');
  expect(await text(page, 'stars')).toBe('★ 5/5');
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
  expect(info.sleepers.length).toBe(20);
  expect(await text(page, 'awake')).toBe('✦ 0/20');
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
    expect(await text(page, 'awake')).toBe(`✦ ${woken}/20`);
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
  expect(await text(page, 'awake')).toBe('✦ 20/20');
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

test('3D: la casa de Miga se visita y el camino llega al portón del skatepark', async ({ page }) => {
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
  await page.keyboard.press('Space');
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
  expect(end[0]).toBeGreaterThan(50);
  expect(end[0]).toBeLessThan(58);
  expect(await text(page, 'districtBanner')).toContain('Skatepark');
  await tp(page, 43, -20);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await step(page, 2);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  expect(await w(() => window.__nexus3d.world.nexus.position.x)).toBeLessThanOrEqual(45);
});
