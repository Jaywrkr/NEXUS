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

async function connect(page, from, to) {
  await tp(page, ...from);
  await touch(page);
  await tp(page, ...to);
  await touch(page);
}

/** Entra al túnel, toca EMPEZAR y lo recorre manteniendo la chispa centrada (o sin manejarla, para chocar). */
async function rideTunnel(page, steer, { backToWorld = true } = {}) {
  await expect.poll(() => mode(page)).toContain('mode-tunnel');
  await expect.poll(() => page.evaluate(() => window.__nexus3d.tunnel.state)).toMatch(/ready|failed/);
  await page.keyboard.press('Space');
  for (let i = 0; i < 160; i += 1) {
    const state = await page.evaluate((steer) => {
      const g = window.__nexus3d;
      if (steer) g.tunnel.offset.set(0, 0);
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
  await rideTunnel(page, true);
  expect(await text(page, 'msg')).toContain('La farola se encendió');
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
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
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
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await rideTunnel(page, false);
  await rideTunnel(page, true);
  expect(await text(page, 'msg')).toContain('La farola se encendió');
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
  await rideTunnel(page, true);
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
