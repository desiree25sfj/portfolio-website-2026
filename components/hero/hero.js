/**
 * components/hero/hero.js
 * ─────────────────────────────────────────────────────────────────────
 * Hero interactive layer — three effects:
 *   1. Text scramble/reveal on the subtitle
 *   2. Ambient particle field on a <canvas>
 *   3. Parallax tilt on the headline (mouse-tracking)
 *
 * All effects are purely additive — the hero looks complete without JS.
 * Effects are disabled for prefers-reduced-motion.
 * ─────────────────────────────────────────────────────────────────────
 */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

init();

function init() {
  if (!REDUCED_MOTION) {
    initScramble();
    initParticles();
    initParallax();
  } else {
    // Still show the final text without the scramble effect
    const el = document.querySelector(".hero__scramble-text");
    if (el) el.textContent = el.dataset.final ?? el.textContent;
  }
}


/* ═══════════════════════════════════════════════════════════════════
   1. TEXT SCRAMBLE
   Randomly cycles through characters before settling on the real text.
   Classic hacker-terminal effect — refined for editorial context.
═══════════════════════════════════════════════════════════════════ */

// Characters used during the scramble phase
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&—·";

function scramble(el, finalText, duration = 1600) {
  const frames     = Math.round(duration / 16);  // ~60fps
  const revealRate = 1 / frames;
  let   frame      = 0;
  let   revealed   = 0;

  // Build the cursor span once
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");

  // Store original content for SR — use aria-label with final text
  el.setAttribute("aria-label", finalText);

  function tick() {
    frame++;
    revealed = Math.floor(frame * revealRate * finalText.length);

    // Build the display string
    let display = "";
    for (let i = 0; i < finalText.length; i++) {
      if (i < revealed) {
        // Character is locked in
        display += finalText[i];
      } else if (finalText[i] === " ") {
        display += " ";
      } else {
        // Still scrambling — random glyph
        display += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }

    el.textContent = display;
    el.appendChild(cursor);  // Re-append cursor after textContent change

    if (frame < frames) {
      requestAnimationFrame(tick);
    } else {
      // Final state
      el.textContent = finalText;
      el.appendChild(cursor);
    }
  }

  requestAnimationFrame(tick);
}

function initScramble() {
  const el = document.querySelector(".hero__scramble-text");
  if (!el) return;

  const finalText = el.dataset.final ?? el.textContent.trim();

  // Start scramble after CSS animation brings the element into view
  const SCRAMBLE_DELAY = 1200; // ms — matches animation-delay in CSS
  setTimeout(() => scramble(el, finalText), SCRAMBLE_DELAY);
}


/* ═══════════════════════════════════════════════════════════════════
   2. AMBIENT PARTICLE FIELD
   Slow-moving dot field — depth layer behind the headline.
   Uses requestAnimationFrame loop with a fixed delta time approach.
═══════════════════════════════════════════════════════════════════ */

function initParticles() {
  const canvas = document.querySelector(".hero__canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animId;
  let W, H;

  // ── Particle factory ───────────────────────────────────────────
  function createParticle() {
    return {
      x:       Math.random() * W,
      y:       Math.random() * H,
      r:       Math.random() * 1.5 + 0.3,          // radius 0.3–1.8px
      vx:      (Math.random() - 0.5) * 0.18,        // slow drift
      vy:      (Math.random() - 0.5) * 0.12,
      opacity: Math.random() * 0.35 + 0.05,
      pulse:   Math.random() * Math.PI * 2,          // phase offset
    };
  }

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Recreate particles on resize so density stays consistent
    const COUNT = Math.floor((W * H) / 12000);  // ~1 per 12k px²
    particles   = Array.from({ length: COUNT }, createParticle);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      // Slow opacity pulse
      p.pulse += 0.005;
      const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

      // Amber particles — brighter alpha on the lifted oklch(22%) bg
      ctx.fillStyle = `rgba(220, 170, 90, ${alpha * 1.6})`;
      ctx.fill();

      // Drift
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -2)  p.x = W + 2;
      if (p.x > W + 2) p.x = -2;
      if (p.y < -2)  p.y = H + 2;
      if (p.y > H + 2) p.y = -2;
    }

    animId = requestAnimationFrame(draw);
  }

  // ── Intersection Observer — pause when hero off-screen ─────────
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (!animId) animId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animId);
        animId = null;
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(canvas.closest(".hero") ?? canvas);

  resize();
  window.addEventListener("resize", resize, { passive: true });
}


/* ═══════════════════════════════════════════════════════════════════
   3. HEADLINE PARALLAX (mouse tracking)
   The hero headline very subtly shifts with the mouse — adds depth
   without being distracting. Max displacement is small (~8px).
═══════════════════════════════════════════════════════════════════ */

function initParallax() {
  const hero     = document.querySelector(".hero");
  const headline = document.querySelector(".hero__title");
  if (!hero || !headline) return;

  const MAX_SHIFT = 8;  // px
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let rafId;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function animate() {
    // Smooth interpolation — eases toward mouse position
    currentX = lerp(currentX, targetX, 0.06);
    currentY = lerp(currentY, targetY, 0.06);

    headline.style.transform = `translate(${currentX}px, ${currentY}px)`;
    rafId = requestAnimationFrame(animate);
  }

  hero.addEventListener("mousemove", (e) => {
    const rect   = hero.getBoundingClientRect();
    const relX   = (e.clientX - rect.left)  / rect.width  - 0.5;  // -0.5 to 0.5
    const relY   = (e.clientY - rect.top)   / rect.height - 0.5;
    targetX      = relX * MAX_SHIFT;
    targetY      = relY * MAX_SHIFT;
  }, { passive: true });

  hero.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
  });

  rafId = requestAnimationFrame(animate);
}