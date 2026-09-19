/* ============================================================
   GOLDEN KEY — interactions
   Core (vanilla, always runs) + Motion (GSAP/Lenis) + 3D (Three.js).
   Libraries are loaded locally & lazily so inner pages need only
   this one script tag.
   ============================================================ */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const VENDOR = "assets/js/vendor/";

/* Accent palettes — id must match the CSS [data-accent] selectors.
   `gem` is the crown-jewel colour used by the 3D key. */
const ACCENTS = [
  { id: "brass",     name: "Латунь",   sw: "#c79a5b", gem: 0xe7c893 },
  { id: "emerald",   name: "Изумруд",  sw: "#2f9e6f", gem: 0x36b579 },
  { id: "sapphire",  name: "Сапфир",   sw: "#5484d8", gem: 0x3f6fd0 },
  { id: "copper",    name: "Медь",     sw: "#cf7a4f", gem: 0xd98a5f },
  { id: "champagne", name: "Шампань",  sw: "#d8cfba", gem: 0xe8dcc2 },
  { id: "bordo",     name: "Бордо",    sw: "#b34a5d", gem: 0xb04559 },
];
let currentGem = ACCENTS[0].gem;

function savedAccentId() {
  try { return localStorage.getItem("gk-accent") || "brass"; } catch (e) { return "brass"; }
}

function applyAccent(id) {
  const a = ACCENTS.find((x) => x.id === id) || ACCENTS[0];
  document.documentElement.setAttribute("data-accent", a.id);
  try { localStorage.setItem("gk-accent", a.id); } catch (e) {}
  currentGem = a.gem;
  if (window.__gkSetGem) window.__gkSetGem(a.gem);
  document.querySelectorAll(".theme-dot").forEach((d) =>
    d.setAttribute("aria-pressed", d.dataset.accent === a.id ? "true" : "false")
  );
}

function buildSwitcher() {
  if (document.querySelector(".theme-switch")) return;
  const wrap = document.createElement("div");
  wrap.className = "theme-switch";
  // Строим через DOM API, без innerHTML: разметка не собирается из строк,
  // поэтому внедрить сюда произвольный HTML невозможно в принципе.
  const pop = document.createElement("div");
  pop.className = "theme-pop";
  pop.setAttribute("role", "group");
  pop.setAttribute("aria-label", "Цвет акцента сайта");
  ACCENTS.forEach((a) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "theme-dot";
    dot.dataset.accent = a.id;
    dot.title = a.name;
    dot.setAttribute("aria-label", "Акцент: " + a.name);
    dot.setAttribute("aria-pressed", "false");
    dot.style.setProperty("--sw", a.sw);
    pop.appendChild(dot);
  });
  const fabBtn = document.createElement("button");
  fabBtn.type = "button";
  fabBtn.className = "theme-fab";
  fabBtn.setAttribute("aria-label", "Выбрать цвет сайта");
  fabBtn.setAttribute("aria-expanded", "false");
  fabBtn.appendChild(document.createElement("span"));
  wrap.append(pop, fabBtn);
  document.body.appendChild(wrap);
  const fab = wrap.querySelector(".theme-fab");
  fab.addEventListener("click", () => {
    const open = wrap.classList.toggle("open");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
  });
  wrap.querySelectorAll(".theme-dot").forEach((d) =>
    d.addEventListener("click", () => {
      applyAccent(d.dataset.accent);
      wrap.classList.remove("open");
      fab.setAttribute("aria-expanded", "false");
    })
  );
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) { wrap.classList.remove("open"); fab.setAttribute("aria-expanded", "false"); }
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

/* ------------------------------------------------------------------
   CORE — plain JS, no dependencies. Must work even if libs fail.
------------------------------------------------------------------ */
function initCore() {
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 16);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".nav-menu");
  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        burger.classList.remove("open");
      })
    );
  }

  // Count-up (IntersectionObserver so it works without GSAP)
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const isInt = Number.isInteger(target);
    if (REDUCED) { el.textContent = (isInt ? target : target.toFixed(1)) + suffix; return; }
    const dur = 1700, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (isInt ? Math.round(v) : v.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  } else counters.forEach(runCount);

  // 3D tilt on hover
  if (FINE_POINTER && !REDUCED) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (ev) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - 0.5;
        const py = (ev.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateY(-6px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  initContactModal();

  // Form submit (demo). Guarded: honeypot against bots + client-side validation.
  // Button label is restored via textContent — never innerHTML — so nothing can
  // inject markup through this path.
  document.querySelectorAll("form[data-fake]").forEach((form) => {
    const setError = (field, message) => {
      const wrap = field.closest(".field") || field.parentElement;
      let msg = wrap.querySelector(".field-error");
      if (!msg) {
        msg = document.createElement("p");
        msg.className = "field-error";
        wrap.appendChild(msg);
      }
      msg.textContent = message;
      field.setAttribute("aria-invalid", "true");
    };
    const clearError = (field) => {
      const wrap = field.closest(".field") || field.parentElement;
      const msg = wrap.querySelector(".field-error");
      if (msg) msg.remove();
      field.removeAttribute("aria-invalid");
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // honeypot: заполнено только ботом — молча выходим
      const trap = form.querySelector(".hp-field input");
      if (trap && trap.value.trim() !== "") return;

      let ok = true;
      const name = form.querySelector("input[name=name]");
      const phone = form.querySelector("input[name=phone]");
      const email = form.querySelector("input[name=email]");
      const review = form.querySelector("textarea[name=review]");

      if (name) {
        const v = name.value.trim();
        if (v.length < 2) { setError(name, "Укажите имя — хотя бы два символа"); ok = false; }
        else clearError(name);
      }
      if (phone) {
        const digits = phone.value.replace(/\D/g, "");
        if (digits.length < 10) { setError(phone, "Укажите номер телефона полностью"); ok = false; }
        else clearError(phone);
      }
      if (email) {
        const v = email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setError(email, "Проверьте адрес почты"); ok = false; }
        else clearError(email);
      }
      if (review) {
        const v = review.value.trim();
        if (v.length < 10) { setError(review, "Напишите хотя бы пару предложений"); ok = false; }
        else clearError(review);
      }
      if (!ok) {
        const bad = form.querySelector("[aria-invalid=true]");
        if (bad) bad.focus();
        return;
      }

      const btn = form.querySelector("button[type=submit]");
      const original = btn ? btn.textContent : "";
      if (btn) { btn.textContent = "Отправляем…"; btn.disabled = true; }
      setTimeout(() => {
        form.reset();
        form.querySelectorAll(".field-error").forEach((n) => n.remove());
        if (btn) {
          btn.textContent = form.dataset.done || "Заявка отправлена";
          setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2600);
        }
      }, 850);
    });
  });

  // Catalog filter
  const filterForm = document.querySelector("[data-filter]");
  if (filterForm) {
    const cards = document.querySelectorAll("[data-prop]");
    const apply = () => {
      const type = filterForm.querySelector("[name=type]").value;
      const deal = filterForm.querySelector("[name=deal]").value;
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!type || c.dataset.type === type) && (!deal || c.dataset.deal === deal);
        c.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      const cnt = document.querySelector("[data-count-result]");
      if (cnt) cnt.textContent = shown;
    };
    filterForm.addEventListener("submit", (e) => { e.preventDefault(); apply(); });
    filterForm.querySelectorAll("select").forEach((s) => s.addEventListener("change", apply));
  }

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Accent switcher
  buildSwitcher();
  applyAccent(savedAccentId());
}

/* ------------------------------------------------------------------
   Окно связи. Ссылки tel:, mailto: и мессенджеры на разных машинах
   ведут себя непредсказуемо: где-то откроется почтовый клиент, где-то
   случайный веб-сервис, где-то «пользователь не найден». Поэтому клик
   открывает окно, в котором посетитель доводит обращение до конца и
   видит подтверждение. На телефоне ссылка tel: не перехватывается —
   там звонилка открывается по-настоящему.
------------------------------------------------------------------ */
function buildContactModal() {
  const wrap = document.createElement("div");
  wrap.className = "cmodal";
  wrap.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "cmodal-back";

  const card = document.createElement("div");
  card.className = "cmodal-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "cmodal-title");

  const close = document.createElement("button");
  close.type = "button";
  close.className = "cmodal-close";
  close.setAttribute("aria-label", "Закрыть");
  close.textContent = "×";

  const kicker = document.createElement("span");
  kicker.className = "eyebrow";

  const title = document.createElement("h3");
  title.className = "cmodal-title";
  title.id = "cmodal-title";

  const sub = document.createElement("p");
  sub.className = "cmodal-sub";

  const form = document.createElement("form");
  form.setAttribute("data-fake", "");
  form.setAttribute("novalidate", "");
  form.autocomplete = "on";

  const mkField = (id, label, tag) => {
    const box = document.createElement("div");
    box.className = "field";
    const lab = document.createElement("label");
    lab.htmlFor = id;
    lab.textContent = label;
    const input = document.createElement(tag);
    input.id = id;
    box.append(lab, input);
    return { box, lab, input };
  };

  const fName = mkField("cm-name", "Как к вам обращаться", "input");
  fName.input.type = "text";
  fName.input.name = "name";
  fName.input.required = true;
  fName.input.maxLength = 80;
  fName.input.autocomplete = "name";
  fName.input.placeholder = "Имя";

  const fContact = mkField("cm-contact", "Телефон", "input");
  const fText = mkField("cm-text", "Сообщение", "textarea");
  fText.input.name = "note";
  fText.input.maxLength = 600;
  fText.input.placeholder = "Кратко опишите задачу (необязательно)";

  const trap = document.createElement("div");
  trap.className = "hp-field";
  trap.setAttribute("aria-hidden", "true");
  const trapIn = document.createElement("input");
  trapIn.type = "text";
  trapIn.name = "city";
  trapIn.tabIndex = -1;
  trapIn.autocomplete = "off";
  trap.appendChild(trapIn);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-gold btn-lg form-submit";
  submit.style.width = "100%";
  submit.style.justifyContent = "center";

  const note = document.createElement("p");
  note.className = "mini-note";
  note.textContent = "Нажимая кнопку, вы соглашаетесь с обработкой персональных данных";

  form.append(fName.box, fContact.box, fText.box, trap, submit, note);
  card.append(close, kicker, title, sub, form);
  wrap.append(backdrop, card);
  document.body.appendChild(wrap);

  return { wrap, backdrop, card, close, kicker, title, sub, form, fContact, fText, submit };
}

function initContactModal() {
  const links = document.querySelectorAll(
    'a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me/"], a[href*="t.me/"]'
  );
  if (!links.length) return;

  const m = buildContactModal();
  let lastFocus = null;

  const prettyPhone = (href) => {
    const d = (href || "").replace(/\D/g, "");
    return d.length === 11
      ? "+" + d[0] + " (" + d.slice(1, 4) + ") " + d.slice(4, 7) + "-" + d.slice(7, 9) + "-" + d.slice(9)
      : "";
  };
  const sitePhone = () => {
    const a = document.querySelector('a[href^="tel:"]');
    return prettyPhone(a && a.getAttribute("href"));
  };

  const PHONE_FIELD = {
    contactLabel: "Телефон",
    contactName: "phone",
    contactType: "tel",
    contactPlaceholder: "+7 (___) ___-__-__",
  };

  const MODES = {
    call: () => Object.assign({
      kicker: "Обратный звонок",
      title: "Перезвоним вам",
      // Номер даём справочно, без ссылки: позвонить из этого окна нельзя,
      // и обещать такую возможность в заголовке было бы неправдой.
      sub: sitePhone() + " · ежедневно 9:00–21:00",
      showText: false,
      button: "Жду звонка",
      done: "Перезвоним в течение 15 минут",
    }, PHONE_FIELD),
    mail: (address) => ({
      kicker: "Письмо",
      title: "Напишите нам",
      sub: address,
      contactLabel: "Ваш e-mail",
      contactName: "email",
      contactType: "email",
      contactPlaceholder: "name@mail.ru",
      showText: true,
      button: "Отправить письмо",
      done: "Письмо отправлено",
    }),
    wa: () => Object.assign({
      kicker: "WhatsApp",
      title: "Написать в WhatsApp",
      sub: "Отвечаем в рабочее время, обычно за 15 минут",
      showText: true,
      button: "Отправить сообщение",
      done: "Сообщение отправлено",
    }, PHONE_FIELD),
    tg: () => Object.assign({
      kicker: "Telegram",
      title: "Написать в Telegram",
      sub: "Отвечаем в рабочее время, обычно за 15 минут",
      showText: true,
      button: "Отправить сообщение",
      done: "Сообщение отправлено",
    }, PHONE_FIELD),
  };

  const close = () => {
    m.wrap.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  const open = (cfg) => {
    m.kicker.textContent = cfg.kicker;
    m.title.textContent = cfg.title;
    m.sub.textContent = cfg.sub;

    m.fContact.lab.textContent = cfg.contactLabel;
    m.fContact.input.type = cfg.contactType;
    m.fContact.input.name = cfg.contactName;
    m.fContact.input.required = true;
    m.fContact.input.maxLength = cfg.contactName === "email" ? 120 : 24;
    m.fContact.input.autocomplete = cfg.contactName === "email" ? "email" : "tel";
    m.fContact.input.placeholder = cfg.contactPlaceholder;

    m.fText.box.hidden = !cfg.showText;
    m.submit.textContent = cfg.button;
    m.submit.disabled = false;
    m.form.dataset.done = cfg.done;
    m.form.reset();
    m.form.querySelectorAll(".field-error").forEach((n) => n.remove());
    m.form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));

    m.wrap.hidden = false;
    document.documentElement.style.overflow = "hidden";
    m.fContact.input.focus({ preventScroll: true });
  };

  // На телефоне tel: должен открывать звонилку — это настоящий звонок.
  const touch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      let cfg;
      if (href.indexOf("tel:") === 0) {
        if (touch) return;
        cfg = MODES.call();
      } else if (href.indexOf("mailto:") === 0) {
        cfg = MODES.mail(href.slice(7).split("?")[0]);
      } else if (href.indexOf("wa.me") !== -1) {
        cfg = MODES.wa();
      } else {
        cfg = MODES.tg();
      }
      e.preventDefault();
      lastFocus = a;
      open(cfg);
    });
  });

  m.close.addEventListener("click", close);
  m.backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !m.wrap.hidden) close();
  });
  // Пока окно открыто, фокус не уходит на страницу под ним.
  m.card.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const items = m.card.querySelectorAll('button, input:not([tabindex="-1"]), textarea');
    const list = [].filter.call(items, (el) => !el.closest("[hidden]"));
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ------------------------------------------------------------------
   MOTION — GSAP + Lenis
------------------------------------------------------------------ */
function initMotion() {
  const gsap = window.gsap;
  if (!gsap) return;
  // Плавная прокрутка Lenis, привязанная к тикеру GSAP
  if (window.Lenis && !REDUCED) {
    const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis");
  }

  // Hero load-in (homepage only)
  if (document.querySelector(".hero")) {
    const heroLines = gsap.utils.toArray(".hero h1 .line > span");
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    if (heroLines.length) {
      gsap.set(heroLines, { yPercent: 115 });
      tl.to(heroLines, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.1);
    }
    tl.from(".hero .eyebrow", { opacity: 0, y: 20, duration: 0.8 }, 0.1)
      .from(".hero p.lead", { opacity: 0, y: 24, duration: 0.9 }, 0.5)
      .from(".hero .split-card", { opacity: 0, y: 24, duration: 0.8, stagger: 0.12 }, 0.6)
      .from(".hero-note", { opacity: 0, duration: 0.7 }, 0.95)
      .from(".hero-stats .stat", { opacity: 0, y: 24, duration: 0.8, stagger: 0.1 }, 0.72)
      .from(".scene", { opacity: 0, scale: 0.94, duration: 1.3, ease: "power3.out" }, 0.3)
      .from(".scene-corner", { opacity: 0, duration: 0.6, stagger: 0.06 }, 0.9);
  }

  // Появление блоков при прокрутке. IntersectionObserver, а не ScrollTrigger:
  // он срабатывает при любом способе прокрутки — включая переход по якорю и
  // восстановление позиции при перезагрузке — и не требует пересчёта при resize,
  // на котором прежняя схема гасила уже показанные блоки.
  const reveals = gsap.utils.toArray(".reveal");
  if (!reveals.length) {
    // на странице 404 таких блоков нет — пустой список GSAP встречает предупреждением
  } else if (!("IntersectionObserver" in window)) {
    gsap.set(reveals, { opacity: 1, y: 0 });
  } else {
    gsap.set(reveals, { opacity: 0, y: 34 });
    const watcher = new IntersectionObserver((entries) => {
      // наблюдатель отдаёт всё, что вошло в кадр, одной пачкой — её и показываем каскадом
      const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      if (!batch.length) return;
      batch.forEach((el) => watcher.unobserve(el));
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true });
    }, { rootMargin: "0px 0px -14% 0px" });
    reveals.forEach((el) => watcher.observe(el));
  }

  // Marquee (seamless loop of a duplicated track)
  const track = document.querySelector(".marquee-track");
  if (track) {
    gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
  }

}

/* ------------------------------------------------------------------
   3D — Three.js brass key in the hero vitrine
------------------------------------------------------------------ */
function initKey() {
  const THREE = window.THREE;
  const mount = document.getElementById("scene");
  if (!THREE || !mount) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 10.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  mount.appendChild(renderer.domElement);

  // Environment map (gradient) so the metal actually reflects & reads as brass
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 16; envCanvas.height = 256;
  const ctx = envCanvas.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0.0, "#20190e");
  grd.addColorStop(0.44, "#0c0a06");
  grd.addColorStop(0.6, "#6f5533");
  grd.addColorStop(0.8, "#0d0b06");
  grd.addColorStop(1.0, "#2c2113");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 16, 256);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.encoding = THREE.sRGBEncoding;
  scene.environment = envTex;

  // Museum bronze — dark, patinated, matte. Faint verdigris glows in the recesses.
  const brass = new THREE.MeshStandardMaterial({
    color: 0x453213, metalness: 0.3, roughness: 0.74, envMap: envTex, envMapIntensity: 0.45,
    emissive: 0x16241b, emissiveIntensity: 0.5,
  });

  // ---- Build an antique skeleton key ----
  const key = new THREE.Group();
  const S = 0.72;   // bow scale
  const P = 1.084;  // crown vertical placement (band sits on the shaft top)

  // Ornate crown (coronet) bow — extruded plate with a finger-hole in the band
  const bowShape = new THREE.Shape();
  bowShape.moveTo(-1.30 * S, -0.95 * S);
  bowShape.lineTo( 1.30 * S, -0.95 * S);
  bowShape.lineTo( 1.30 * S, -0.30 * S);
  bowShape.lineTo( 1.15 * S,  1.05 * S);
  bowShape.lineTo( 0.86 * S,  0.30 * S);
  bowShape.lineTo( 0.58 * S,  1.45 * S);
  bowShape.lineTo( 0.29 * S,  0.35 * S);
  bowShape.lineTo( 0.00 * S,  1.90 * S);
  bowShape.lineTo(-0.29 * S,  0.35 * S);
  bowShape.lineTo(-0.58 * S,  1.45 * S);
  bowShape.lineTo(-0.86 * S,  0.30 * S);
  bowShape.lineTo(-1.15 * S,  1.05 * S);
  bowShape.lineTo(-1.30 * S, -0.30 * S);
  bowShape.closePath();
  const eye = new THREE.Path();
  eye.absarc(0, -0.5 * S, 0.28 * S, 0, Math.PI * 2, true);
  bowShape.holes.push(eye);
  const bowGeo = new THREE.ExtrudeGeometry(bowShape, {
    depth: 0.32, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 6,
  });
  bowGeo.translate(0, 0, -0.16);
  const bow = new THREE.Mesh(bowGeo, brass);
  bow.position.y = P;
  key.add(bow);

  // Jewel cabochons capping the five points + a stone on the band.
  // Colour follows the site accent via window.__gkSetGem().
  const gemMat = new THREE.MeshStandardMaterial({
    color: currentGem, metalness: 0.0, roughness: 0.24, envMap: envTex, envMapIntensity: 0.85,
    emissiveIntensity: 0.55,
  });
  gemMat.emissive.copy(gemMat.color).multiplyScalar(0.32);
  window.__gkSetGem = (hex) => {
    gemMat.color.setHex(hex);
    gemMat.emissive.copy(gemMat.color).multiplyScalar(0.32);
  };
  const gem = (x, y, r, z = 0) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), gemMat);
    m.position.set(x, y, z); return m;
  };
  key.add(gem(0,          P + 1.90 * S, 0.20));
  key.add(gem( 0.58 * S,  P + 1.45 * S, 0.16));
  key.add(gem(-0.58 * S,  P + 1.45 * S, 0.16));
  key.add(gem( 1.15 * S,  P + 1.05 * S, 0.15));
  key.add(gem(-1.15 * S,  P + 1.05 * S, 0.15));
  key.add(gem(0,          P - 0.50 * S, 0.15, 0.18));

  // Decorative collars (rings) around the shaft
  const ring = (y, R, tube) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 20, 44), brass);
    m.rotation.x = Math.PI / 2; m.position.y = y; return m;
  };
  key.add(ring(0.30, 0.27, 0.08));   // under the bow
  key.add(ring(0.05, 0.31, 0.06));   // twin bead
  key.add(ring(-2.25, 0.24, 0.07));  // before the bit

  // Central shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.17, 3.4, 32), brass);
  shaft.position.y = -1.3;
  key.add(shaft);

  // Bit (ward-cut) — an extruded plate with two teeth and an inner ward hole
  const bitShape = new THREE.Shape();
  bitShape.moveTo(0, -0.58);
  bitShape.lineTo(0.98, -0.58);
  bitShape.lineTo(0.98, -0.14);
  bitShape.lineTo(0.56, -0.14);
  bitShape.lineTo(0.56, 0.14);
  bitShape.lineTo(0.98, 0.14);
  bitShape.lineTo(0.98, 0.58);
  bitShape.lineTo(0, 0.58);
  bitShape.closePath();
  const ward = new THREE.Path();
  ward.moveTo(0.16, -0.3); ward.lineTo(0.42, -0.3); ward.lineTo(0.42, 0.3); ward.lineTo(0.16, 0.3); ward.closePath();
  bitShape.holes.push(ward);
  const bitGeo = new THREE.ExtrudeGeometry(bitShape, {
    depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 6,
  });
  bitGeo.translate(0, 0, -0.14);
  const bit = new THREE.Mesh(bitGeo, brass);
  bit.position.set(0.1, -2.62, 0);
  key.add(bit);

  key.rotation.z = -0.1;
  key.scale.setScalar(0.8);
  scene.add(key);

  // Lights — dim & moody for a museum-lit patinated bronze
  scene.add(new THREE.AmbientLight(0x241f14, 0.8));
  const keyLight = new THREE.DirectionalLight(0xffdcA0, 0.42);
  keyLight.position.set(-4, 6, 6);
  scene.add(keyLight);
  const rim = new THREE.PointLight(0xe7c893, 6, 40);
  rim.position.set(5, -1, 4);
  scene.add(rim);
  const cool = new THREE.PointLight(0x6f9a8a, 7, 40);
  cool.position.set(-6, -3, 2);
  scene.add(cool);
  // Backlight from behind the key — rims the silhouette with a warm glowing edge
  const back = new THREE.PointLight(0xffcf86, 17, 42);
  back.position.set(0, 0.4, -4);
  scene.add(back);

  // Soft warm halo (additive glow sprite) sitting just behind the key
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 256;
  const gctx = glowCanvas.getContext("2d");
  const gg = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0.0, "rgba(233,201,150,0.55)");
  gg.addColorStop(0.35, "rgba(199,154,91,0.26)");
  gg.addColorStop(1.0, "rgba(199,154,91,0)");
  gctx.fillStyle = gg; gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9,
  }));
  glow.scale.set(8.5, 9.5, 1);
  glow.position.set(0, 0.1, -1.6);
  scene.add(glow);

  // Atmospheric dust
  const dustGeo = new THREE.BufferGeometry();
  const N = 90, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i*3] = (Math.random() - 0.5) * 10;
    pos[i*3+1] = (Math.random() - 0.5) * 10;
    pos[i*3+2] = (Math.random() - 0.5) * 5 - 1;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc79a5b, size: 0.035, transparent: true, opacity: 0.5 }));
  scene.add(dust);

  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(mount);
  else window.addEventListener("resize", resize);

  // Pointer parallax
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  if (FINE_POINTER) {
    mount.addEventListener("pointermove", (e) => {
      const r = mount.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    mount.addEventListener("pointerleave", () => { target.x = 0; target.y = 0; });
  }

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    // gentle oscillation keeps the crown legible; pointer adds tilt
    key.rotation.y = Math.sin(t * 0.5) * 0.55 + cur.x * 0.5;
    key.rotation.x = Math.sin(t * 0.4) * 0.06 + cur.y * 0.35;
    key.position.y = Math.sin(t * 0.9) * 0.14;
    glow.position.y = 0.1 + key.position.y * 0.6;
    glow.material.opacity = 0.78 + Math.sin(t * 1.3) * 0.12; // gentle breathing halo
    dust.rotation.y = t * 0.03;
    renderer.render(scene, camera);
    if (!REDUCED) requestAnimationFrame(frame);
  }
  if (REDUCED) { key.rotation.y = 0.35; frame(); }
  else requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------
   Boot
------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initCore();

  const needsKey = !!document.getElementById("scene");
  const jobs = [
    loadScript(VENDOR + "gsap.min.js")
      .then(() => loadScript(VENDOR + "lenis.min.js").catch(() => {}))
      .then(initMotion)
      .catch((e) => console.warn("[GK] motion disabled:", e.message)),
  ];
  if (needsKey) {
    jobs.push(
      loadScript(VENDOR + "three.min.js")
        .then(initKey)
        .catch((e) => console.warn("[GK] 3D disabled:", e.message))
    );
  }
  Promise.allSettled(jobs);
});
