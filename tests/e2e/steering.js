/** Frame-paced DOM inputs avoid protocol latency; no physics or position writes. */
export async function steer(page, scene, target) {
  return page.evaluate(({ scene, target }) => new Promise(resolve => {
    const s = window.__nexusTest.scene.getScene(scene);
    const canvas = window.__nexusTest.canvas;
    const mobile = matchMedia('(pointer: coarse)').matches;
    const rect = canvas.getBoundingClientRect();
    const center = { x: 90, y: s.scale.height - 90 };
    const pressed = new Set();
    const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
    const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: name, code: name, keyCode: codes[name], which: codes[name], bubbles: true, cancelable: true,
    }));
    const touch = (type, px, py) => {
      const clientX = rect.left + px * rect.width / s.scale.width;
      const clientY = rect.top + py * rect.height / s.scale.height;
      const point = new Touch({ identifier: 1, target: canvas,
        clientX, clientY, pageX: clientX + scrollX, pageY: clientY + scrollY, screenX: clientX, screenY: clientY,
        radiusX: 1, radiusY: 1, force: 1 });
      canvas.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
        touches: type === 'touchend' ? [] : [point], targetTouches: type === 'touchend' ? [] : [point], changedTouches: [point] }));
    };
    const stop = success => {
      for (const name of pressed) key(name, false);
      if (mobile) touch('touchend', center.x, center.y);
      resolve(success);
    };
    if (mobile) touch('touchstart', center.x, center.y);
    const deadline = performance.now() + 60_000;
    const frame = () => {
      if (!s.scene.isActive()) { stop(true); return; }
      if (performance.now() > deadline) { stop(false); return; }
      const tunnel = scene === 'CableTunnelScene';
      if (tunnel && s.finished) { stop(s.phase !== 'failed'); return; }
      const goal = tunnel ? s.tubeCenterAt(s.progress + 40) : target;
      const dx = goal.x - (tunnel ? s.shipX : s.nexus.x);
      const dy = goal.y - (tunnel ? s.shipY : s.nexus.y);
      if (!tunnel && Math.abs(dx) < 14 && Math.abs(dy) < 14) { stop(true); return; }
      // Read velocity only to anticipate the game's existing deceleration.
      const aimX = dx - (tunnel ? s.shipVelX : s.nexus.body.velocity.x) * 0.1;
      const aimY = dy - (tunnel ? s.shipVelY : s.nexus.body.velocity.y) * 0.1;
      const direction = { x: Math.abs(aimX) > 7 ? Math.sign(aimX) : 0, y: Math.abs(aimY) > 7 ? Math.sign(aimY) : 0 };
      if (mobile) {
        const magnitude = Math.hypot(direction.x, direction.y) || 1;
        touch('touchmove', center.x + direction.x * 40 / magnitude, center.y + direction.y * 40 / magnitude);
      } else {
        const desired = new Set();
        if (direction.x) desired.add(direction.x > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (direction.y) desired.add(direction.y > 0 ? 'ArrowDown' : 'ArrowUp');
        for (const name of pressed) if (!desired.has(name)) { key(name, false); pressed.delete(name); }
        for (const name of desired) if (!pressed.has(name)) { key(name, true); pressed.add(name); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }), { scene, target });
}
