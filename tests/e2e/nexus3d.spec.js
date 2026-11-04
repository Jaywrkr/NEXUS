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

/** Pasa el túnel manteniendo la chispa en el centro (o sin manejarla, para perder). */
async function rideTunnel(page, steer) {
  await expect.poll(() => mode(page)).toContain('mode-tunnel');
  for (let i = 0; i < 110; i += 1) {
    const done = await page.evaluate((steer) => {
      const g = window.__nexus3d;
      if (steer) g.tunnel.offset.set(0, 0);
      g.step(0.1);
      return g.tunnel.done;
    }, steer);
    if (done) break;
  }
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-world');
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

test('3D: las cuatro zonas, el museo y el progreso guardado', async ({ page }) => {
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
  expect(await text(page, 'stars')).toBe('★ 1/4');

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
  expect(await text(page, 'msg')).toBe('¡El barrio entero volvió a la vida!');
  await step(page, 4);
  // Con las cuatro zonas, el color vuelve a todo el pueblo (también lejos de las zonas)
  expect(await page.evaluate(() => window.__nexus3d.world.lifeAt(-40, 40))).toBeGreaterThan(0.99);
  await expect.poll(() => mode(page), { timeout: 15_000 }).toContain('mode-museum');
  await expect(page.locator('#museumComplete')).toBeVisible();
  await leaveMuseum(page);

  // El fragmento secreto (detrás de la casa) no cuenta para la colección de zonas
  await collect(page, -18, -39.6);
  expect(await text(page, 'msg')).toBe('¡Encontraste un fragmento secreto!');
  await leaveMuseum(page);
  expect(await text(page, 'stars')).toBe('★ 4/4');

  // Recargar: Continuar restaura todo
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__nexus3d));
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('#play')).toBeHidden();
  await page.evaluate(() => document.getElementById('continue').click());
  await expect.poll(() => mode(page)).toContain('mode-world');
  expect(await text(page, 'msg')).toBe('Ya le devolviste la vida a todo el barrio');
  expect(await text(page, 'stars')).toBe('★ 4/4');
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

test('3D: el túnel sin manejar falla y deja reintentar', async ({ page }) => {
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
  await rideTunnel(page, false);
  expect(await text(page, 'toast')).toContain('Perdiste el control en el túnel');
  expect(await text(page, 'msg')).toBe('El barrio está triste y sin color. Conecta la fuente con la farola');
  await connect(page, [-22.6, -13.8], [-14.3, -16.5]);
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
