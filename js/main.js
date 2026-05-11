const toggle = document.querySelector(".nav-toggle");
const links = document.querySelectorAll(".nav-links a");

function closeMenu() {
  document.body.classList.remove("nav-open");
  toggle?.setAttribute("aria-expanded", "false");
}

toggle?.addEventListener("click", () => {
  const isOpen = toggle.getAttribute("aria-expanded") === "true";
  document.body.classList.toggle("nav-open", !isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
});

links.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});
