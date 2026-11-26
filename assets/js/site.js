// Vigie site, shared by index.html and versions.html. Plain JavaScript, no
// dependency, no build step. Same structure as the Projo, Harvie and Suivi
// sites. Without JavaScript the pages still work: download links point to the
// latest GitHub release page, every FAQ answer is shown and the feedback links
// open the GitHub issue forms.
"use strict";

(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var REPO = "FELTRINCyril/Vigie-releases";
  var TRUSTED = /^https:\/\/github\.com\/FELTRINCyril\/Vigie-releases\//;

  // ===== Visitors who are not on a Mac ====================================
  var notMac = (function platformNote() {
    var ua = navigator.userAgent || "";
    var touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS
    var text = null;
    if (/iPhone|iPod/.test(ua)) {
      text = "Vous êtes sur iPhone : Vigie est une app pour Mac, elle s'installe depuis un Mac.";
    } else if (/iPad/.test(ua) || touchMac) {
      text = "Vigie est une app pour Mac. Ouvrez cette page sur votre Mac pour l'installer.";
    } else if (/Android/.test(ua)) {
      text = "Vigie est une app pour Mac, il n'existe pas de version Android.";
    } else if (/Windows|CrOS|Linux/.test(ua)) {
      text = "Vigie est une app pour Mac, il n'existe pas de version pour cet ordinateur.";
    }
    if (!text) return false;
    document.querySelectorAll(".js-platform-note").forEach(function (note) {
      note.textContent = text;
      note.hidden = false;
    });
    return true;
  })();

  // ===== Download button: always the latest DMG ===========================
  // The DMG name changes with every version (Vigie-<version>.dmg, release
  // tagged v<version>), so it is read from the GitHub API. If the API fails
  // (offline, rate limit of 60 requests per hour and per address), the links
  // keep their fallback: the latest release page on GitHub. No version is
  // ever written in the page.
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var CACHE_KEY = "vigie-latest-v1";
  var CACHE_MS = 10 * 60 * 1000;
  var DMG = /^Vigie-([0-9][0-9A-Za-z.]*)\.dmg$/;

  function isRelease(r) {
    return !!r && typeof r.version === "string" && /^[0-9][0-9A-Za-z.]*$/.test(r.version) &&
      typeof r.url === "string" && typeof r.size === "number" && r.size > 0 && isFinite(r.size);
  }

  function readCache() {
    try {
      var data = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      return data && Date.now() - data.at < CACHE_MS && isRelease(data.release) ? data.release : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(release) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), release: release }));
    } catch (e) {
      /* private mode or storage disabled: no cache, nothing else changes */
    }
  }

  // GET a GitHub API URL as JSON, with a timeout. Shared with versions.js.
  function githubJSON(url) {
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller ? controller.signal : undefined,
      credentials: "omit",
      referrerPolicy: "no-referrer"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("GitHub API: HTTP " + response.status);
        return response.json();
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function fetchLatest() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    return githubJSON(API).then(function (json) {
      var asset = (json.assets || []).filter(function (a) { return DMG.test(a.name); })[0];
      if (!asset) throw new Error("GitHub API: no Vigie DMG in the latest release");
      var release = { version: DMG.exec(asset.name)[1], size: asset.size, url: asset.browser_download_url };
      if (!isRelease(release)) throw new Error("GitHub API: unexpected release data");
      writeCache(release);
      return release;
    });
  }

  function megabytes(bytes) {
    // Binary megabytes, at least 1. Plain digits, no locale grouping (it
    // would insert a non-breaking space).
    return String(Math.max(1, Math.round(bytes / 1048576)));
  }

  function applyRelease(release) {
    if (!TRUSTED.test(release.url)) return;
    // Not on a Mac: keep the release page link rather than starting a
    // download that cannot be used on this device.
    if (!notMac) {
      document.querySelectorAll(".js-download").forEach(function (link) { link.href = release.url; });
    }
    document.querySelectorAll(".js-download-meta").forEach(function (meta) {
      meta.textContent = "Version " + release.version + " - " + megabytes(release.size) + " Mo";
    });
    document.querySelectorAll(".js-notes").forEach(function (link) {
      link.href = "versions.html#v" + release.version;
      link.textContent = "Notes de la version " + release.version;
    });
  }

  if ("fetch" in window && "Promise" in window && document.querySelector(".js-download, .js-notes")) {
    fetchLatest().then(applyRelease).catch(function (error) {
      // Fallback already in place in the HTML; keep a trace for debugging.
      if (window.console) console.info("Vigie: fallback to the releases page.", error && error.message);
    });
  }

  // ===== Every release (versions page and feedback form) =================
  var RELEASES = "https://api.github.com/repos/" + REPO + "/releases?per_page=100";
  var RELEASES_KEY = "vigie-releases-v1";

  function parseVersion(tag) {
    var m = /^v?(\d+(?:\.\d+)*)(?:-(\d+))?$/.exec(tag || "");
    return m ? { version: m[1], build: m[2] || "" } : null;
  }

  // Newest first, by version number (publication dates may not be in order).
  function compareVersions(a, b) {
    var x = a.version.split(".").map(Number);
    var y = b.version.split(".").map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (y[i] || 0) - (x[i] || 0);
      if (d) return d;
    }
    return (Number(b.build) || 0) - (Number(a.build) || 0);
  }

  function shapeReleases(json) {
    if (!Array.isArray(json)) throw new Error("GitHub API: unexpected list");
    return json.filter(function (r) { return !r.draft && !r.prerelease; }).map(function (r) {
      var v = parseVersion(r.tag_name);
      if (!v) return null;
      var asset = (r.assets || []).filter(function (a) { return DMG.test(a.name) && TRUSTED.test(a.browser_download_url) && typeof a.size === "number"; })[0];
      return {
        version: v.version,
        build: v.build,
        tag: r.tag_name,
        date: r.published_at,
        body: typeof r.body === "string" ? r.body : "",
        dmg: asset ? { url: asset.browser_download_url, size: asset.size, name: asset.name } : null
      };
    }).filter(Boolean).sort(compareVersions);
  }

  function validRelease(r) {
    return !!r && typeof r.version === "string" && typeof r.body === "string" && typeof r.tag === "string" &&
      (r.dmg === null || (TRUSTED.test(r.dmg.url) && typeof r.dmg.size === "number" && isFinite(r.dmg.size)));
  }

  var releasesPromise = null;
  function loadReleases() {
    if (releasesPromise) return releasesPromise;
    try {
      var data = JSON.parse(window.localStorage.getItem(RELEASES_KEY) || "null");
      if (data && Date.now() - data.at < CACHE_MS && Array.isArray(data.list) && data.list.every(validRelease)) {
        releasesPromise = Promise.resolve(data.list);
        return releasesPromise;
      }
    } catch (e) { /* no cache */ }
    releasesPromise = githubJSON(RELEASES).then(shapeReleases).then(function (list) {
      try { window.localStorage.setItem(RELEASES_KEY, JSON.stringify({ at: Date.now(), list: list })); } catch (e) { /* no cache */ }
      return list;
    });
    releasesPromise.catch(function () { releasesPromise = null; }); // retry on next use
    return releasesPromise;
  }

  // For versions.js (same origin, loaded after this file).
  window.Vigie = { loadReleases: loadReleases, megabytes: megabytes, notMac: notMac, REPO: REPO };

  // ===== FAQ accordion: one answer open at a time =========================
  var questions = [];
  document.querySelectorAll(".qa button[aria-controls]").forEach(function (button) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    questions.push({ button: button, panel: panel });
  });
  function setOpen(item, open) {
    item.button.setAttribute("aria-expanded", String(open));
    item.panel.hidden = !open;
  }
  questions.forEach(function (item) {
    setOpen(item, false);
    item.button.addEventListener("click", function () {
      var willOpen = item.button.getAttribute("aria-expanded") !== "true";
      questions.forEach(function (other) { if (other !== item) setOpen(other, false); });
      setOpen(item, willOpen);
    });
  });

  // ===== Feedback form (dialog) ===========================================
  // The site cannot create a GitHub issue by itself: that needs a signed-in
  // GitHub account (a static page cannot hold a secret token). The visitor
  // fills the form here, then GitHub opens the new issue already filled in.

  // macOS versions offered in the list, newest first. Same list as the Projo
  // site (Apple security releases, read on 20/11/2026). Vigie needs macOS 26.
  // Add each new release at the top of its group; a new major version gets a
  // new group on top.
  var SYSTEMS = [
    { label: "macOS 27 Golden Gate", versions: ["27.2.1", "27.2", "27.0.1", "27"] },
    { label: "macOS 26 Tahoe", versions: ["26.7.3", "26.7.2", "26.7.1", "26.7", "26.6.2", "26.6.1", "26.6", "26.5.2", "26.5.1", "26.5", "26.4.1", "26.4", "26.3.2", "26.3.1", "26.3", "26.2", "26.1", "26.0.1", "26"] }
  ];

  // Field ids are those of .github/ISSUE_TEMPLATE/*.yml: GitHub fills its
  // issue form from query parameters named after them.
  var FORMS = {
    probleme: {
      title: "Signaler un problème",
      intro: "Décrivez ce qui ne fonctionne pas. Plus c'est précis, plus c'est rapide à corriger.",
      prefix: "[Problème] ",
      fields: [
        { id: "title", label: "En une phrase", required: true, placeholder: "L'analyse reste bloquée sur l'étape Docker" },
        { id: "version-vigie", type: "vigie", label: "Version de Vigie", hint: "Dans Vigie : Réglages > Général > Mises à jour (par exemple 0.3.0 (4)).", required: true },
        { id: "version-systeme", type: "system", label: "Version de macOS", hint: "Menu Pomme > À propos de ce Mac." },
        { id: "modele", label: "Modèle de Mac (facultatif)", hint: "Menu Pomme > À propos de ce Mac.", placeholder: "MacBook Air M2, 2022" },
        { id: "ce-qui-sest-passe", label: "Ce qui s'est passé", hint: "Et le message d'erreur exact s'il y en a un.", required: true, area: true },
        { id: "attendu", label: "Ce qui était attendu", required: true, area: true },
        { id: "etapes", label: "Étapes pour reproduire (facultatif)", area: true, placeholder: "1. Ouvrir Vigie depuis la barre des menus\n2. Libérer de l'espace > Analyser\n3. ..." }
      ],
      after: "Vous pourrez ajouter des captures d'écran sur GitHub, avant d'envoyer : masquez d'abord les noms de fichiers et de dossiers."
    },
    idee: {
      title: "Proposer une idée",
      intro: "Une fonction qui manque, quelque chose à rendre plus simple ?",
      prefix: "[Idée] ",
      fields: [
        { id: "title", label: "En une phrase", required: true, placeholder: "Pouvoir exclure un dossier de l'analyse" },
        { id: "idee", label: "Votre idée", hint: "Ce que vous aimeriez pouvoir faire dans Vigie.", required: true, area: true },
        { id: "pourquoi", label: "Pourquoi (facultatif)", hint: "Dans quelle situation cela vous servirait.", area: true },
        { id: "version-vigie", type: "vigie", label: "Version de Vigie", hint: "Dans Vigie : Réglages > Général > Mises à jour (par exemple 0.3.0 (4))." }
      ]
    },
    question: {
      title: "Poser une question",
      intro: "La réponse est peut-être déjà dans les questions fréquentes du site.",
      prefix: "[Question] ",
      fields: [
        { id: "title", label: "En une phrase", required: true, placeholder: "Pourquoi un élément reste-t-il en orange ?" },
        { id: "question", label: "Votre question", required: true, area: true },
        { id: "version-vigie", type: "vigie", label: "Version de Vigie", hint: "Dans Vigie : Réglages > Général > Mises à jour (par exemple 0.3.0 (4))." },
        { id: "version-systeme", type: "system", label: "Version de macOS", hint: "Menu Pomme > À propos de ce Mac." }
      ]
    }
  };
  var UNKNOWN_VIGIE = "Je ne sais pas";
  var OTHER_SYSTEM = "Autre version";

  // Measured on the Projo site (20/11/2026): a signed-out visitor goes through
  // the login page, which re-encodes the URL in return_to. Up to 4500
  // characters it is kept; beyond, the message can be lost without any error.
  var MAX_URL = 4500;

  // What must never reach a public issue: Vigie lists the files of the Mac,
  // so a pasted path easily carries a user name or a client name.
  var SENSITIVE = [
    { re: /\/Users\/[^\/\s]+/, why: "un chemin qui contient votre nom d'utilisateur" },
    { re: /~\/(Documents|Desktop|Bureau|Downloads|Téléchargements)\//i, why: "un chemin de vos dossiers personnels" },
    { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, why: "une adresse e-mail" },
    { re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/, why: "une adresse IP" },
    { re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b/, why: "un jeton d'accès" },
    { re: /\b(password|passwd|pwd|token|secret)\s*[=:]/i, why: "un mot de passe ou un jeton" }
  ];

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function option(value, text) {
    var o = el("option", null, text || value);
    o.value = value;
    return o;
  }

  var dialog = null;
  var opener = null;

  function buildDialog(kind) {
    var conf = FORMS[kind];
    var d = el("dialog", { class: "fb", "aria-labelledby": "fb-heading" });
    var form = el("form", { class: "fb-form", novalidate: "" });
    var head = el("div", { class: "fb-head" });
    head.appendChild(el("h2", { id: "fb-heading" }, conf.title));
    var close = el("button", { type: "button", class: "fb-close", "aria-label": "Fermer" });
    close.appendChild(el("span", { "aria-hidden": "true" }));
    close.addEventListener("click", function () { d.close(); });
    head.appendChild(close);
    form.appendChild(head);
    form.appendChild(el("p", { class: "fb-intro" }, conf.intro));

    var warn = el("div", { class: "fb-warn", role: "note" });
    warn.appendChild(el("strong", null, "Ce message sera public. "));
    warn.appendChild(document.createTextNode("Tout le monde peut lire les issues de Vigie sur GitHub. N'y mettez jamais de chemin complet, de nom d'utilisateur, de nom de client ou de projet, ni de mot de passe."));
    form.appendChild(warn);

    conf.fields.forEach(function (f) {
      var wrap = el("div", { class: "fb-field" });
      var inputId = "fb-" + f.id;
      var label = el("label", { for: inputId }, f.label || "");
      var hint = el("p", { class: "fb-hint", id: inputId + "-hint" }, f.hint || "");
      var input;
      if (f.type === "vigie") {
        input = el("select", { id: inputId, name: f.id, disabled: "" });
        input.appendChild(option("", "Chargement des versions..."));
        fillVigieVersions(input, wrap, f.required);
      } else if (f.type === "system") {
        input = el("select", { id: inputId, name: f.id });
        SYSTEMS.forEach(function (group) {
          var g = el("optgroup", { label: group.label });
          group.versions.forEach(function (v) { g.appendChild(option("macOS " + v)); });
          input.appendChild(g);
        });
        input.appendChild(option(OTHER_SYSTEM));
        input.selectedIndex = 0; // newest version by default
      } else {
        input = el(f.area ? "textarea" : "input", { id: inputId, name: f.id, maxlength: f.area ? "2000" : "140" });
        if (f.area) input.rows = 4;
        else { input.type = "text"; input.setAttribute("autocomplete", "off"); }
        if (f.placeholder) input.placeholder = f.placeholder;
        if (f.required) input.required = true;
      }
      input.setAttribute("aria-describedby", inputId + "-hint");
      wrap.appendChild(label);
      wrap.appendChild(hint);
      wrap.appendChild(input);
      form.appendChild(wrap);
    });

    var consent = el("div", { class: "fb-consent" });
    var box = el("input", { type: "checkbox", id: "fb-consent", required: "" });
    consent.appendChild(box);
    consent.appendChild(el("label", { for: "fb-consent" }, "Je n'ai mis aucune information personnelle (chemin complet, nom de client ou de projet) dans ce message."));
    form.appendChild(consent);

    var error = el("p", { class: "fb-error", role: "alert", id: "fb-error" });
    error.hidden = true;
    form.appendChild(error);

    var foot = el("div", { class: "fb-foot" });
    foot.appendChild(el("p", { class: "fb-note" }, "GitHub ouvre ensuite votre message, déjà rempli : relisez-le, cochez à nouveau la case de confidentialité, puis envoyez. Un compte GitHub gratuit est nécessaire." + (conf.after ? " " + conf.after : "")));
    var submit = el("button", { type: "submit", class: "btn btn-primary fb-submit", "aria-describedby": "fb-submit-why" }, "Continuer sur GitHub");
    foot.appendChild(submit);
    var why = el("p", { class: "fb-why", id: "fb-submit-why" }, "Cochez la case de confidentialité pour continuer.");
    foot.appendChild(why);
    form.appendChild(foot);

    // The consent box is mandatory: the button stays greyed out until it is ticked.
    function syncSubmit() {
      submit.disabled = !box.checked;
      why.hidden = box.checked;
    }
    box.addEventListener("change", syncSubmit);
    syncSubmit();

    // Any edit clears the previous error: it described the old content.
    form.addEventListener("input", function () { error.hidden = true; });
    form.addEventListener("change", function () { error.hidden = true; });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var problem = validate(form, conf, box);
      if (problem) {
        error.textContent = problem.message;
        error.hidden = false;
        if (problem.field) problem.field.focus();
        return;
      }
      error.hidden = true;
      var url = issueURL(kind, form, conf);
      if (url.length > MAX_URL) {
        // Share of the typed text to remove. Only the part of the URL that
        // comes from the text fields shrinks when the text does (each field
        // is sent twice, an accent takes 6 characters once encoded).
        var fixed = issueURL(kind, form, conf, true).length;
        var excess = Math.min(95, Math.max(5, Math.ceil((url.length - MAX_URL) / Math.max(1, url.length - fixed) * 100 / 5) * 5));
        error.textContent = "Le message est trop long pour être transmis à GitHub : raccourcissez-le d'environ " + excess + " %.";
        error.hidden = false;
        return;
      }
      window.open(url, "_blank", "noopener");
      // A blocked pop-up cannot be detected (noopener returns null): keep the
      // message, and give a link to open GitHub by hand.
      showReady(url);
    });

    var ready = el("div", { class: "fb-ready" });
    ready.hidden = true;
    ready.appendChild(el("h2", { id: "fb-ready-title", tabindex: "-1" }, "Votre message est prêt"));
    ready.appendChild(el("p", null, "GitHub l'a ouvert dans un nouvel onglet : relisez-le, cochez la case de confidentialité, puis envoyez."));
    var again = el("a", { class: "btn btn-primary", target: "_blank", rel: "noopener" }, "Rouvrir GitHub");
    var back = el("button", { type: "button", class: "fb-link" }, "Modifier le message");
    var done = el("button", { type: "button", class: "fb-link" }, "Fermer");
    var actions = el("div", { class: "fb-ready-actions" });
    actions.appendChild(again);
    actions.appendChild(back);
    actions.appendChild(done);
    ready.appendChild(actions);
    ready.appendChild(el("p", { class: "fb-note" }, "Rien ne s'est ouvert ? Votre navigateur a peut-être bloqué la fenêtre : utilisez \"Rouvrir GitHub\"."));
    back.addEventListener("click", function () { ready.hidden = true; form.hidden = false; submit.focus(); });
    done.addEventListener("click", function () { d.close(); });
    function showReady(url) {
      again.href = url;
      form.hidden = true;
      ready.hidden = false;
      ready.querySelector("#fb-ready-title").focus();
    }

    d.appendChild(form);
    d.appendChild(ready);
    d.addEventListener("close", function () {
      if (opener && document.contains(opener)) opener.focus();
    });
    // A click on the backdrop closes the dialog, but not the end of a text
    // selection dragged out of a field (press inside, release outside).
    var pressedOnBackdrop = false;
    d.addEventListener("pointerdown", function (event) { pressedOnBackdrop = event.target === d; });
    d.addEventListener("click", function (event) {
      if (event.target === d && pressedOnBackdrop) d.close();
      pressedOnBackdrop = false;
    });
    return d;
  }

  // Every published version of Vigie, newest selected. If the list cannot be
  // read (API limit, offline, nothing published yet), the field becomes a
  // plain text field.
  function fillVigieVersions(select, wrap, required) {
    loadReleases().then(function (list) {
      if (!list.length) throw new Error("no release");
      select.textContent = "";
      var latest = list.filter(function (r) { return r.dmg; })[0] || list[0];
      list.forEach(function (r) {
        var value = r.version + (r.build ? " (" + r.build + ")" : "");
        select.appendChild(option(value, value + (r === latest ? " - dernière version" : "")));
      });
      select.appendChild(option(UNKNOWN_VIGIE));
      select.selectedIndex = list.indexOf(latest);
      select.disabled = false;
    }).catch(function () {
      var input = el("input", { type: "text", id: select.id, name: select.name, maxlength: "40", autocomplete: "off", placeholder: "0.3.0" });
      input.setAttribute("aria-describedby", select.getAttribute("aria-describedby") || "");
      if (required) input.required = true;
      if (wrap.contains(select)) wrap.replaceChild(input, select);
    });
  }

  function validate(form, conf, box) {
    for (var i = 0; i < conf.fields.length; i++) {
      var f = conf.fields[i];
      var input = form.elements[f.id];
      if (!input || input.tagName === "SELECT") continue;
      var value = input.value.trim();
      if (f.required && !value) {
        return { field: input, message: "Le champ \"" + f.label + "\" est obligatoire." };
      }
      for (var j = 0; j < SENSITIVE.length; j++) {
        if (SENSITIVE[j].re.test(value)) {
          var name = form.querySelector("label[for='" + input.id + "']").textContent;
          return { field: input, message: "Le champ \"" + name + "\" semble contenir " + SENSITIVE[j].why + ". Retirez-le : ce message sera public." };
        }
      }
    }
    if (!box.checked) return { field: box, message: "Cochez la case de confidentialité pour continuer." };
    return null;
  }

  // Two ways to carry the message, both in the same URL:
  // - one query parameter per field id: GitHub fills its issue form with
  //   them (only once .github/ISSUE_TEMPLATE/ is on the default branch);
  // - "body": the whole message as Markdown, in the layout GitHub gives to an
  //   issue form answer. GitHub uses it when it shows the plain issue editor
  //   (template not on the default branch yet), so nothing is ever lost.
  function issueURL(kind, form, conf, fixedOnly) {
    var params = ["template=" + encodeURIComponent(kind + ".yml")];
    var body = [];
    function add(id, label, value) {
      params.push(encodeURIComponent(id) + "=" + encodeURIComponent(value));
      if (label) body.push("### " + label + "\n\n" + value);
    }
    conf.fields.forEach(function (f) {
      var input = form.elements[f.id];
      var value = input ? input.value.trim() : "";
      if (fixedOnly && input && input.tagName !== "SELECT") value = "";
      if (!value) return;
      if (f.id === "title") { add("title", null, conf.prefix + value); return; }
      var label = form.querySelector("label[for='" + input.id + "']").textContent.replace(/ \(facultatif\)$/, "");
      add(f.id, label, value);
    });
    body.push("### Confidentialité\n\n- [x] Je n'ai mis aucune information personnelle (chemin complet, nom de client ou de projet) dans ce message.");
    params.push("body=" + encodeURIComponent(body.join("\n\n")));
    return "https://github.com/" + REPO + "/issues/new?" + params.join("&");
  }

  function openForm(kind, from) {
    if (!FORMS[kind] || typeof HTMLDialogElement === "undefined") return false;
    if (dialog) dialog.remove();
    dialog = buildDialog(kind);
    document.body.appendChild(dialog);
    opener = from || null;
    dialog.showModal();
    var first = dialog.querySelector("#fb-title");
    if (first) first.focus();
    return true;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("[data-issue]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openForm(link.getAttribute("data-issue"), link)) event.preventDefault();
  });

  // ===== Motion ===========================================================
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Reveal: small details inside the feature visuals play once in view.
  var revealed = document.querySelectorAll("[data-reveal]");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    revealed.forEach(function (node) { node.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    revealed.forEach(function (node) { io.observe(node); });
  }

  // Tilt of the app window, both ways: it looks up while it enters from the
  // bottom of the screen, stands straight around the middle, and looks down
  // while it leaves at the top. CSS scroll-driven animation where supported;
  // elsewhere (Firefox, older Safari) this sets --tilt from 1 to -1.
  var supportsTimeline = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  var tilted = document.querySelectorAll(".js-tilt");
  if (tilted.length && !supportsTimeline && !reduce.matches) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight || 1;
      tilted.forEach(function (win) {
        var rect = win.getBoundingClientRect();
        if (!rect.height) return;
        // 0 when the window starts to enter, 1 when it has left (same range as
        // the CSS "cover" range), with a flat plateau between 40 % and 60 %.
        var p = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
        var tilt = p < 0.4 ? 1 - p / 0.4 : p > 0.6 ? -(p - 0.6) / 0.4 : 0;
        win.style.setProperty("--tilt", tilt.toFixed(3));
        win.style.setProperty("--tilt-abs", Math.abs(tilt).toFixed(3));
      });
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
})();
