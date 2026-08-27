
(() => {
  const data = window.CG_DATA;

  const gunById = new Map(data.guns.map(item => [item.id, item]));
  const drugById = new Map(data.drugs.map(item => [item.id, item]));

  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");

  function switchView(viewId) {
    views.forEach(view => view.classList.toggle("active", view.id === viewId));
    navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewId));
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function populateSelect(select, tierMap, preferred) {
    select.replaceChildren();
    Object.keys(tierMap).forEach(tier => {
      const option = document.createElement("option");
      option.value = tier;
      option.textContent = tier;
      select.appendChild(option);
    });
    if (preferred && tierMap[preferred]) {
      select.value = preferred;
    }
  }

  function itemsForTier(configMap, selectedTier, lookupMap) {
    const cfg = configMap[selectedTier];
    if (!cfg) return [];
    return cfg.ids.map(id => lookupMap.get(id)).filter(Boolean);
  }

  function makeReelCard(item) {
    const card = document.createElement("div");
    card.className = "reel-card";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.draggable = false;

    card.appendChild(img);
    return card;
  }

  function makeDropCard(item) {
    const card = document.createElement("div");
    card.className = "drop-card";
    card.title = item.name;

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.draggable = false;

    const name = document.createElement("div");
    name.className = "drop-name";
    name.textContent = item.name;

    card.append(img, name);
    return card;
  }

  function setupSpinner(options) {
    const {
      select,
      button,
      spinner,
      reel,
      dropsWrap,
      configMap,
      lookupMap,
      preferredTier
    } = options;

    let spinning = false;

    function setIdleReel() {
      if (spinning) return;
      const pool = itemsForTier(configMap, select.value, lookupMap);

      reel.style.transition = "none";
      reel.replaceChildren();

      if (!pool.length) return;

      const idle = [];
      for (let i = 0; i < 14; i++) idle.push(pool[i % pool.length]);
      idle.forEach(item => reel.appendChild(makeReelCard(item)));

      requestAnimationFrame(() => {
        const first = reel.querySelector(".reel-card");
        if (!first) return;
        const cardWidth = first.getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(reel).gap) || 0;
        const step = cardWidth + gap;
        const index = Math.min(4, idle.length - 1);
        const x = spinner.clientWidth / 2 - (index * step + cardWidth / 2);
        reel.style.transform = `translateX(${x}px)`;
      });
    }

    async function rollOnce(pool) {
      const totalCards = 62;
      const winnerIndex = totalCards - 8;
      const winner = randomItem(pool);

      const sequence = [];
      for (let i = 0; i < totalCards; i++) {
        sequence.push(randomItem(pool));
      }
      sequence[winnerIndex] = winner;

      reel.style.transition = "none";
      reel.style.transform = "translateX(0px)";
      reel.replaceChildren(...sequence.map(makeReelCard));

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const first = reel.querySelector(".reel-card");
      const cardWidth = first.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(reel).gap) || 0;
      const step = cardWidth + gap;
      const jitter = (Math.random() - 0.5) * cardWidth * 0.42;
      const x = spinner.clientWidth / 2 - (winnerIndex * step + cardWidth / 2) + jitter;

      reel.style.transition = `transform ${data.settings.spinDurationMs}ms cubic-bezier(.08,.64,.06,1)`;
      reel.style.transform = `translateX(${x}px)`;

      await sleep(data.settings.spinDurationMs + 70);
      return winner;
    }

    async function spin() {
      if (spinning) return;
      const tierCfg = configMap[select.value];
      const pool = itemsForTier(configMap, select.value, lookupMap);
      if (!pool.length || !tierCfg) return;

      spinning = true;
      button.disabled = true;
      select.disabled = true;
      dropsWrap.replaceChildren();

      try {
        const rollCount = tierCfg.count || 4;
        for (let i = 0; i < rollCount; i++) {
          const winner = await rollOnce(pool);
          dropsWrap.appendChild(makeDropCard(winner));
          if (i < rollCount - 1) {
            await sleep(data.settings.pauseBetweenRollsMs || 0);
          }
        }
      } finally {
        spinning = false;
        button.disabled = false;
        select.disabled = false;
      }
    }

    populateSelect(select, configMap, preferredTier);
    select.addEventListener("change", setIdleReel);
    button.addEventListener("click", spin);
    window.addEventListener("resize", setIdleReel);
    setIdleReel();
  }

  function renderTierSections(target, items, groups, labelSuffix, specialZero=false) {
    target.replaceChildren();

    groups.forEach(group => {
      const list = items.filter(item => item.stars === group.stars);
      if (!list.length) return;

      const block = document.createElement("section");
      block.className = "tier-block" + (group.special ? " special" : "");

      const heading = document.createElement("h3");
      heading.textContent = group.title;

      const grid = document.createElement("div");
      grid.className = "weapon-grid";

      list.forEach(item => {
        const card = document.createElement("article");
        card.className = "tier-card";
        card.title = item.name;

        const imageBox = document.createElement("div");
        imageBox.className = "tier-image";

        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.name;
        img.draggable = false;

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = item.name;

        imageBox.appendChild(img);
        card.append(imageBox, name);
        grid.appendChild(card);
      });

      block.append(heading, grid);
      target.appendChild(block);
    });
  }

  setupSpinner({
    select: document.getElementById("factionTierSelect"),
    button: document.getElementById("factionSpinButton"),
    spinner: document.getElementById("factionSpinner"),
    reel: document.getElementById("factionReel"),
    dropsWrap: document.getElementById("factionDrops"),
    configMap: data.factionTiers,
    lookupMap: gunById,
    preferredTier: "Tier 1.5"
  });

  setupSpinner({
    select: document.getElementById("drugTierSelect"),
    button: document.getElementById("drugSpinButton"),
    spinner: document.getElementById("drugSpinner"),
    reel: document.getElementById("drugReel"),
    dropsWrap: document.getElementById("drugDrops"),
    configMap: data.drugTiers,
    lookupMap: drugById,
    preferredTier: "Tier 1"
  });

  renderTierSections(
    document.getElementById("gunTierSections"),
    data.guns,
    [
      { stars: 1, title: "1 Star Weapons" },
      { stars: 2, title: "2 Star Weapons" },
      { stars: 3, title: "3 Star Weapons" },
      { stars: 4, title: "4 Star Weapons" },
      { stars: 5, title: "5 Star Weapons" },
      { stars: 0, title: "Special Weapons", special: true }
    ]
  );

  renderTierSections(
    document.getElementById("drugTierSections"),
    data.drugs,
    [
      { stars: 1, title: "1 Leaf Products" },
      { stars: 2, title: "2 Leaf Products" },
      { stars: 3, title: "3 Leaf Products" },
      { stars: 4, title: "4 Leaf Products" }
    ]
  );
})();
