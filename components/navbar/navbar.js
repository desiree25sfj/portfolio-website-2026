/**
 * components/navbar/navbar.js
 * ─────────────────────────────────────────────────────────────────────
 * Navbar interactive logic — three responsibilities:
 *   1. Toggle mobile menu open/closed (hamburger ↔ ×)
 *   2. Scroll-hide: collapse navbar when scrolling DOWN, reveal on UP
 *   3. aria-current="page": mark the active link for accessibility
 *
 * Conventions:
 *   • Pure ES Module — no globals leaked, no dependencies
 *   • DOM mutations via data attributes & ARIA — CSS reads them
 *   • IntersectionObserver / requestAnimationFrame where appropriate
 * ─────────────────────────────────────────────────────────────────────
 */


/* ═══════════════════════════════════════════════════════════════════
   INITIALISE
   Called once the module loads (modules are deferred by default).
═══════════════════════════════════════════════════════════════════ */
init();

function init() {
  initToggle();
  initScrollBehaviour();
  initActiveLink();
}


/* ═══════════════════════════════════════════════════════════════════
   1. MOBILE TOGGLE
   Toggles aria-expanded on the hamburger button.
   CSS reads aria-expanded to show/hide the menu and animate the icon.
═══════════════════════════════════════════════════════════════════ */
function initToggle() {
  const toggle = document.querySelector(".navbar__toggle");
  const header = document.querySelector(".site-header");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    const nextState  = String(!isExpanded);

    // Flip the ARIA attribute — CSS does the rest
    toggle.setAttribute("aria-expanded", nextState);

    // Update accessible label so screen readers announce the correct action
    toggle.setAttribute(
      "aria-label",
      isExpanded ? "Open navigation menu" : "Close navigation menu"
    );

    // Prevent background page scrolling while menu is open
    document.body.style.overflow = isExpanded ? "" : "hidden";
  });

  // Close menu when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      document.body.style.overflow = "";
      toggle.focus(); // Return focus to trigger element
    }
  });

  // Close menu when clicking the backdrop (the navbar::before pseudo-element
  // is pointer-events: auto when open, but we listen on the header for clicks
  // outside the menu panel)
  header?.addEventListener("click", (e) => {
    const menuPanel = document.querySelector(".navbar__list");
    const isOpen    = toggle.getAttribute("aria-expanded") === "true";

    if (isOpen && menuPanel && !menuPanel.contains(e.target) && e.target !== toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      document.body.style.overflow = "";
    }
  });
}


/* ═══════════════════════════════════════════════════════════════════
   2. SCROLL BEHAVIOUR
   • Adds [data-scrolled] once user scrolls past the threshold —
     CSS uses this to deepen the glass effect.
   • Adds/removes [data-hidden] based on scroll direction —
     CSS translates the header off-screen when hidden.

   Uses requestAnimationFrame to throttle scroll events and avoid
   layout thrashing (reading scrollY triggers layout; we batch reads).
═══════════════════════════════════════════════════════════════════ */
function initScrollBehaviour() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const SCROLL_THRESHOLD = 60;  // px before glass deepens
  const HIDE_THRESHOLD   = 120; // px before hide kicks in

  let lastScrollY  = window.scrollY;
  let ticking      = false;

  function onScroll() {
    if (!ticking) {
      // Schedule the update on the next animation frame
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  function updateHeader() {
    const currentScrollY = window.scrollY;
    const scrollingDown  = currentScrollY > lastScrollY;

    // [data-scrolled] — glass depth
    if (currentScrollY > SCROLL_THRESHOLD) {
      header.dataset.scrolled = "";
    } else {
      delete header.dataset.scrolled;
    }

    // [data-hidden] — hide on scroll down, reveal on scroll up
    if (currentScrollY > HIDE_THRESHOLD) {
      if (scrollingDown) {
        header.dataset.hidden = "";
      } else {
        delete header.dataset.hidden;
      }
    } else {
      // Always show near top
      delete header.dataset.hidden;
    }

    lastScrollY = currentScrollY;
    ticking     = false;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}


/* ═══════════════════════════════════════════════════════════════════
   3. ACTIVE LINK (aria-current)
   Marks the currently active page link with aria-current="page".
   CSS uses the attribute for visual styling; screen readers use it
   to announce "current page" when a user navigates to the link.

   Strategy: compare each link's pathname to the current page's
   pathname. Handles trailing-slash normalisation.
═══════════════════════════════════════════════════════════════════ */
function initActiveLink() {
  const links = document.querySelectorAll(".navbar__link");
  if (!links.length) return;

  // Normalise a path: strip trailing slash, lowercase
  const normalise = (path) => path.replace(/\/$/, "").toLowerCase() || "/";

  const currentPath = normalise(window.location.pathname);

  links.forEach((link) => {
    const linkPath = normalise(new URL(link.href, window.location.origin).pathname);

    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}