// === Fichier JavaScript complet avec catégories fixes et gestion du filtre ===
let events = {};
let currentEvents = [];
let currentIndex = -1;

// Catégories fixes avec icônes associées
const categoryColors = {
  "Gouvernance et pilotage stratégique": "#007b7f",
  "Données, surveillance et recherche": "#4b0082",
  "Promotion de la santé et prévention": "#e76f51",
  "Protection sanitaire et gestion des risques": "#f4a261",
  "Accès aux services et aux moyens": "#2a9d8f",
  "Contexte": "#6c757d"
};

const fixedCategoryIcons = {
  "Gouvernance et pilotage stratégique": "fa-scale-balanced",
  "Données, surveillance et recherche": "fa-database",
  "Promotion de la santé et prévention": "fa-heart-pulse",
  "Protection sanitaire et gestion des risques": "fa-shield-alt",
  "Accès aux services et aux moyens": "fa-hospital",
  "Contexte": "fa-landmark"
};
const fixedCategories = Object.keys(categoryColors);

function getIconForCategory(cat) {
  const icon = fixedCategoryIcons[cat] || "fa-circle";
  const color = categoryColors[cat] || "#888";
  return `<i class="fas ${icon}" title="${cat}" style="margin-right:4px;color:${color}"></i>`;
}

fetch('explorer.json')
  .then(r => r.json())
  .then(data => {
    events = expandMultiYearEvents(data);
    initDropdowns();
    updateTimeline();
    document.getElementById("event-details-container").innerHTML = `<p style="text-align:center; font-style:italic; color:#555;">Cliquez sur un événement pour accéder à sa fiche détaillée.</p>`;
  })
  .catch(err => console.error("Erreur de chargement :", err));

function expandMultiYearEvents(data) {
  const expanded = {};
  for (const year in data) {
    data[year].forEach(ev => {
      const start = parseInt(ev.start || year);
      const end = parseInt(ev.end || year);
  for (let y = start; y <= end; y++) {
  const yStr = y.toString();
  if (!expanded[yStr]) expanded[yStr] = [];
  const key = `${ev.name}-${ev.start || year}-${ev.end || year}`;
  if (!expanded[yStr].some(e => `${e.name}-${e.start || year}-${e.end || year}` === key)) {
    const clone = { ...ev };
clone.uid = key;
expanded[yStr].push(clone);
  }
}
        });
  }
  return expanded;
}

function getFilters() {
  const getChecked = cls => [...document.querySelectorAll('.' + cls + '-filter:checked')].map(e => e.value);
  return {
    categories: getChecked("category"),
    keywords: getChecked("keyword"),
    search: document.getElementById("searchInput").value.toLowerCase()
  };
}

function updateTimeline() {
  const container = document.getElementById("timeline");
  container.innerHTML = "";
  const filters = getFilters();

  for (const year in events) {
    const filtered = events[year].filter(e =>
      (!filters.categories.length || (Array.isArray(e.category) ? e.category.some(c => filters.categories.includes(c)) : filters.categories.includes(e.category))) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
  e.name?.toLowerCase().includes(filters.search) ||
  e.description?.toLowerCase().includes(filters.search) ||
  (Array.isArray(e.keywords) && e.keywords.some(k => k.toLowerCase().includes(filters.search))) ||
  (Array.isArray(e.sources) && e.sources.some(s => s.toLowerCase().includes(filters.search))) ||
  (Array.isArray(e.category) ? e.category.join(',').toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
  `${e.start}`.includes(filters.search) || `${e.end}`.includes(filters.search)
))
    );

    if (filtered.length) {
      const block = document.createElement("div");
      block.className = "year-block";
      block.innerHTML = `
      <h3 class="timeline-year">${year}</h3>
        <ul class="event-grid">
          ${filtered.map((ev, i) => {
            const id = `event-${year}-${i}`;
            window[id] = ev;
            const isMulti = ev.start && ev.end && ev.start !== ev.end;
            const isContext = Array.isArray(ev.category) ? ev.category.includes("Contexte") : ev.category === "Contexte";
            const contextClass = isContext ? "context-event" : "";
           const iconHTML = (Array.isArray(ev.category) ? ev.category : [ev.category])
  .map(cat => getIconForCategory(cat)).join("");
            return `<li class="${contextClass}" data-uid="${ev.name}-${year}" onclick='showDetails(window["${id}"], "${year}")'>${iconHTML}<span>${ev.name}</span>${isMulti ? `<span class="multi-year-badge">Pluriannuel</span>` : ""}</li>`;
          }).join("")}
        </ul>
`;
      container.appendChild(block);
    }
  }
  updateDependentFilters();
  updateActiveFilterBadges();
}

function updateDependentFilters() {
  const filters = getFilters();
  const visibleKeywords = new Set();
  const visibleCategories = new Set();

  Object.values(events).flat().forEach(ev => {
    const matchCat = !filters.categories.length || (Array.isArray(ev.category) ? ev.category.some(cat => filters.categories.includes(cat)) : filters.categories.includes(ev.category));
    const matchKey = !filters.keywords.length || ev.keywords.some(k => filters.keywords.includes(k));
    if (matchCat && matchKey) {
      ev.keywords.forEach(k => visibleKeywords.add(k));
      (Array.isArray(ev.category) ? ev.category : [ev.category]).forEach(cat => visibleCategories.add(cat));
    }
  });

    document.querySelectorAll(".keyword-filter").forEach(cb => {
    cb.parentElement.style.color = visibleKeywords.has(cb.value) ? "black" : "#999";
  });
  document.querySelectorAll(".category-filter").forEach(cb => {
    cb.parentElement.style.color = visibleCategories.has(cb.value) ? "black" : "#999";
  });
}

function initDropdowns() {
  const keywords = new Set();
  
 Object.values(events).flat().forEach(e => {
  e.keywords.forEach(k => keywords.add(k));
  });

   document.getElementById("categoryDropdown").innerHTML =
    fixedCategories.map(c => {
      const iconHTML = getIconForCategory(c);
      return `<label>
        <input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()">
        ${iconHTML} ${c}
      </label><br>`;
    }).join("");

  document.getElementById("keywordDropdown").innerHTML =
    Array.from(keywords).map(k => `
      <label><input type="checkbox" class="keyword-filter" value="${k}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()"> ${k}</label><br>
    `).join("");
}

function showDetails(ev, year) {
  currentEvents = collectFilteredEvents();
  currentIndex = currentEvents.findIndex(e => e.uid === ev.uid);
  const container = document.getElementById("event-details-container");
  const isMulti = ev.start && ev.end && ev.start !== ev.end;
 const catList = (Array.isArray(ev.category) ? ev.category : [ev.category])
  .map(cat => `<li>${getIconForCategory(cat)} ${cat}</li>`).join("");
  const sourceList = (ev.sources || []).map(src => src.startsWith("http") ? `<a href="${src}" target="_blank">${src}</a>` : src).join("<br>");
  const keywordList = (ev.keywords || []).map(k => `• ${k}`).join("<br>");

  container.innerHTML = `
    <h2 style="color:#007b7f; font-size:1.2rem; margin-bottom: 1rem;">${ev.name}</h2>
    <p><strong>${isMulti ? "Période" : "Année"} :</strong> ${isMulti ? `${ev.start} – ${ev.end}` : year}</p>
    <div>
  <strong>Catégorie(s) :</strong>
  <ul style="list-style: none; padding-left: 0; text-align: left;">
    ${catList}
  </ul>
</div>
    <p><strong>Mots-clés :</strong><br>${keywordList}</p>
    <p><strong>Description :</strong><br>${ev.description || "N/A"}</p>
    <p><strong>Source(s) :</strong><br>${sourceList || "N/A"}</p>`;
container.innerHTML += `
  <div style="display:flex; justify-content: space-between; margin-top: 1.5rem;">
    <button class="button" onclick="navigateEvent(-1)">◀ Précédent</button>
    <button class="button" onclick="navigateEvent(1)">Suivant ▶</button>
  </div>
`;
  document.querySelectorAll(".year-block li").forEach(li => li.classList.remove("selected-event"));
  const selected = document.querySelector(`li[data-uid="${ev.name}-${year}"]`);
  if (selected) {
  selected.classList.add("selected-event");
  selected.scrollIntoView({ behavior: "smooth", block: "center" });
}
}
function navigateEvent(dir) {
  if (currentEvents.length === 0 || currentIndex === -1) return;

  const currentUid = currentEvents[currentIndex].uid;
  let nextIndex = currentIndex + dir;

  while (
    nextIndex >= 0 &&
    nextIndex < currentEvents.length &&
    currentEvents[nextIndex].uid === currentUid
  ) {
    nextIndex += dir;
  }

  if (nextIndex >= 0 && nextIndex < currentEvents.length) {
    currentIndex = nextIndex;
    const nextEvent = currentEvents[nextIndex];
    const year = Object.keys(events).find(y =>
      events[y].some(e => e.uid === nextEvent.uid)
    );
    showDetails(nextEvent, year);
  }
}

function collectFilteredEvents() {
  const filters = getFilters();
  return Object.entries(events).flatMap(([year, list]) =>
    list.filter(e =>
      (!filters.categories.length || (Array.isArray(e.category) ? e.category.some(cat => filters.categories.includes(cat)) : filters.categories.includes(e.category))) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
  e.name?.toLowerCase().includes(filters.search) ||
  e.description?.toLowerCase().includes(filters.search) ||
  (Array.isArray(e.keywords) && e.keywords.some(k => k.toLowerCase().includes(filters.search))) ||
  (Array.isArray(e.sources) && e.sources.some(s => s.toLowerCase().includes(filters.search))) ||
  (Array.isArray(e.category) ? e.category.join(',').toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
  `${e.start}`.includes(filters.search) || `${e.end}`.includes(filters.search)
))
    )
  );
}

function updateActiveFilterBadges() {
  const filters = getFilters();
  const container = document.getElementById("active-filters");
  const section = document.getElementById("active-filters-section");
  container.innerHTML = "";
  const all = [
    ...filters.categories.map(c => ({ type: "category", value: c })),
    ...filters.keywords.map(k => ({ type: "keyword", value: k }))
  ];
  if (all.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  all.forEach(({ type, value }) => {
    const badge = document.createElement("span");
    badge.className = "filter-badge";
    badge.innerHTML = `${type === "category" ? "Catégorie" : "Mot-clé"} : ${value} <span class="remove-badge" data-type="${type}" data-value="${value}">&times;</span>`;
    container.appendChild(badge);
  });
  document.querySelectorAll(".remove-badge").forEach(span => {
    span.addEventListener("click", () => {
      const type = span.dataset.type;
      const value = span.dataset.value;
      const selector = `.${type}-filter[value="${value}"]`;
      const cb = document.querySelector(selector);
      if (cb) {
        cb.checked = false;
        updateTimeline();
        updateDependentFilters();
        updateActiveFilterBadges();
      }
    });
  });
}

function resetFilters() {
  document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  updateTimeline();
  updateActiveFilterBadges();
}
function toggleFilters() {
  const el = document.getElementById("filters");
  el.style.display = (el.style.display === "none" || el.style.display === "") ? "block" : "none";
}
function toggleSidePanel() {
  const panel = document.getElementById('side-panel');
  panel.style.display = (panel.style.display === 'none') ? 'flex' : 'none';
}
function toggleSidePanel() {
  const panel = document.getElementById('side-panel');
  const openBtn = document.getElementById('open-panel-btn');

  if (panel.style.display === 'none') {
    panel.style.display = 'flex';
    openBtn.style.display = 'none';
  } else {
    panel.style.display = 'none';
    openBtn.style.display = 'block';
  }
}
function toggleSidePanel() {
  const layout = document.getElementById("app-layout");
  layout.classList.toggle("sidebar-hidden");
}
function toggleHelpPanel() {
  const panel = document.getElementById('help-panel');
  panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
}

function toggleHelpModal() {
  const modal = document.getElementById("help-modal");
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

function toggleNewModal() {
  const modal = document.getElementById("new-modal");
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

window.addEventListener("DOMContentLoaded", function () {
  const header = document.querySelector("header"); // ← tu avais oublié de définir "header"
  const main = document.querySelector(".main-content");
  if (header && main) {
    const headerHeight = header.offsetHeight;
    main.style.paddingTop = headerHeight + "px";
  }
});
function toggleCategoryInfo() {
  const box = document.getElementById("category-info-box");
  box.classList.toggle("hidden");
}
function toggleCategoryTooltip(event) {
  event.stopPropagation(); // évite que le clic se propage

  const tooltip = document.getElementById("categoryTooltip");
  const isVisible = !tooltip.classList.contains("hidden");
  
  document.querySelectorAll(".tooltip-floating").forEach(el => el.classList.add("hidden"));
  
  if (!isVisible) {
    tooltip.classList.remove("hidden");
    document.addEventListener("click", closeTooltipOnClickOutside);
  }
}

function closeTooltipOnClickOutside(e) {
  const tooltip = document.getElementById("categoryTooltip");
  if (!tooltip.contains(e.target) && !e.target.classList.contains("info-icon")) {
    tooltip.classList.add("hidden");
    document.removeEventListener("click", closeTooltipOnClickOutside);
  }
}
function toggleInfoModal() {
  const modal = document.getElementById("infoModal");
  modal.classList.toggle("hidden");
}
function toggleInfoModal() {
  const modal = document.getElementById("infoModal");
  modal.classList.toggle("hidden");
}
