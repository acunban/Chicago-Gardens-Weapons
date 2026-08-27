
(() => {
  const rootData = window.CG_DATA;
  const weapons = rootData.weapons;
  const weaponById = new Map(weapons.map(w => [w.id, w]));

  const tierSelect = document.getElementById("tierSelect");
  const spinButton = document.getElementById("spinButton");
  const spinner = document.getElementById("spinner");
  const reel = document.getElementById("reel");
  const drops = document.getElementById("drops");
  const tierSections = document.getElementById("tierSections");

  let spinning = false;

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function poolForFactionTier(tier) {
    return (rootData.factionTiers[tier] || [])
      .map(id => weaponById.get(id))
      .filter(Boolean);
  }

  function makeReelCard(weapon) {
    const card = document.createElement("div");
    card.className = "reel-card";

    const img = document.createElement("img");
    img.src = weapon.image;
    img.alt = weapon.name;
    img.draggable = false;

    card.appendChild(img);
    return card;
  }

  function makeDropCard(weapon) {
    const card = document.createElement("div");
    card.className = "drop-card";
    card.title = weapon.name;

    const img = document.createElement("img");
    img.src = weapon.image;
    img.alt = weapon.name;
    img.draggable = false;

    const name = document.createElement("div");
    name.className = "drop-name";
    name.textContent = weapon.name;

    card.append(img, name);
    return card;
  }

  function populateFactionTiers() {
    tierSelect.replaceChildren();

    Object.keys(rootData.factionTiers).forEach(tier => {
      const option = document.createElement("option");
      option.value = tier;
      option.textContent = tier;
      tierSelect.appendChild(option);
    });

    if (rootData.factionTiers["Tier 1.5"]) {
      tierSelect.value = "Tier 1.5";
    }
  }

  function setIdleReel() {
    if (spinning) return;

    const pool = poolForFactionTier(tierSelect.value);
    reel.style.transition = "none";
    reel.replaceChildren();

    if (!pool.length) return;

    const idle = [];
    for (let i = 0; i < 14; i++) {
      idle.push(pool[i % pool.length]);
    }

    idle.forEach(w => reel.appendChild(makeReelCard(w)));

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

    reel.style.transition = `transform ${rootData.settings.spinDurationMs}ms cubic-bezier(.08,.64,.06,1)`;
    reel.style.transform = `translateX(${x}px)`;

    await sleep(rootData.settings.spinDurationMs + 70);
    return winner;
  }

  async function spinFactionDrop() {
    if (spinning) return;

    const pool = poolForFactionTier(tierSelect.value);
    if (!pool.length) return;

    spinning = true;
    spinButton.disabled = true;
    tierSelect.disabled = true;
    drops.replaceChildren();

    try {
      const rollCount = rootData.settings.dropsPerSpin || 4;

      for (let i = 0; i < rollCount; i++) {
        const winner = await rollOnce(pool);
        drops.appendChild(makeDropCard(winner));

        if (i < rollCount - 1) {
          await sleep(rootData.settings.pauseBetweenRollsMs || 0);
        }
      }
    } finally {
      spinning = false;
      spinButton.disabled = false;
      tierSelect.disabled = false;
    }
  }

  function renderTierSections() {
    tierSections.replaceChildren();

    const groups = [
      { stars: 1, title: "1 Star Weapons" },
      { stars: 2, title: "2 Star Weapons" },
      { stars: 3, title: "3 Star Weapons" },
      { stars: 4, title: "4 Star Weapons" },
      { stars: 5, title: "5 Star Weapons" },
      { stars: 0, title: "Special Weapons", special: true }
    ];

    groups.forEach(group => {
      const list = weapons.filter(w => w.stars === group.stars);
      if (!list.length) return;

      const block = document.createElement("section");
      block.className = "tier-block" + (group.special ? " special" : "");

      const heading = document.createElement("h3");
      heading.textContent = group.title;

      const grid = document.createElement("div");
      grid.className = "weapon-grid";

      list.forEach(weapon => {
        const card = document.createElement("article");
        card.className = "tier-card";
        card.title = weapon.name;

        const imageBox = document.createElement("div");
        imageBox.className = "tier-image";

        const img = document.createElement("img");
        img.src = weapon.image;
        img.alt = weapon.name;
        img.draggable = false;

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = weapon.name;

        imageBox.appendChild(img);
        card.append(imageBox, name);
        grid.appendChild(card);
      });

      block.append(heading, grid);
      tierSections.appendChild(block);
    });
  }

  tierSelect.addEventListener("change", setIdleReel);
  spinButton.addEventListener("click", spinFactionDrop);

  window.addEventListener("resize", () => {
    if (!spinning) setIdleReel();
  });

  populateFactionTiers();
  renderTierSections();
  setIdleReel();
})();
