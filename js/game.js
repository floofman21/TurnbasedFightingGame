/* ============================================================
 * DBZ Tournament — Combat Engine & Game Flow
 * ------------------------------------------------------------
 * 4-Quadrant arena: fighters move between zones each round.
 * Turn flow: pick move → pick zone to move to → pick zone to
 * aim at. Both fighters act simultaneously — you must predict
 * where the enemy will dodge when choosing your aim.
 *
 * Rock-paper-scissors layer:
 *   - Melee / Ki Blast deal damage.
 *   - Power Up restores ki but leaves you EXPOSED next round.
 *   - Guard halves incoming hits and restores a little ki.
 *   - Specials are big-ki ultimates; some pierce guard.
 * ==========================================================*/

(function () {
  "use strict";

  const SAVE_KEY = "dbzt_save_v1";

  // Quadrant IDs and display labels
  const QUADS = ["tl", "tr", "bl", "br"];
  const QUAD_LABELS = {
    tl: "Upper Left",
    tr: "Upper Right",
    bl: "Lower Left",
    br: "Lower Right",
  };

  // ---- Persistent progress (unlocks) -----------------------
  const Save = {
    load() {
      try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
      catch (_) { return {}; }
    },
    write(data) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
      catch (_) {}
    },
    get friezaUnlocked() { return !!this.load().friezaUnlocked; },
    unlockFrieza() { const d = this.load(); d.friezaUnlocked = true; this.write(d); },
    get clears() { return this.load().clears || 0; },
    addClear() { const d = this.load(); d.clears = (d.clears || 0) + 1; this.write(d); },
  };

  // ---- Central game state ----------------------------------
  const G = {
    screen: "title",
    playerId: null,
    rung: 0,
    dragonBalls: 0,
    player: null,
    enemy: null,
    busy: false,
    log: [],
    // Quadrant positions
    playerPos: "bl",
    enemyPos: "tr",
    // Turn state
    pendingMove: null,
    pendingPlayerPos: null,
    pendingAimPos: null,
  };

  function makeCombatant(fighterId, diff = 1) {
    const f = FIGHTERS[fighterId];
    return {
      id: f.id,
      name: f.name,
      title: f.title,
      color: f.color,
      aura: f.aura,
      maxHp: Math.round(f.hp * diff),
      hp: Math.round(f.hp * diff),
      ki: 0,
      maxKi: 100,
      atk: f.atk * diff,
      def: f.def * diff,
      speed: f.speed,
      kiRegen: f.kiRegen,
      special: f.special,
      guarding: false,
      exposed: false,
    };
  }

  // =========================================================
  //  DOM helpers
  // =========================================================
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  function show(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + screenId).classList.add("active");
    G.screen = screenId;
  }

  // =========================================================
  //  TITLE + CHARACTER SELECT
  // =========================================================
  function renderSelect() {
    const grid = $("#roster");
    grid.innerHTML = "";
    const ids = Object.keys(FIGHTERS).filter((id) => {
      const f = FIGHTERS[id];
      return f.playable || (f.unlockable && Save.friezaUnlocked);
    });

    ids.forEach((id) => {
      const f = FIGHTERS[id];
      const card = el("button", "fighter-card");
      card.style.setProperty("--c", f.color);
      card.style.setProperty("--a", f.aura);
      card.innerHTML = `
        <div class="portrait"><span class="orb"></span><span class="fname">${f.name}</span></div>
        <div class="ftitle">${f.title}</div>
        <div class="fblurb">${f.blurb}</div>
        <div class="statbars">
          ${statBar("HP", f.hp, 150)}
          ${statBar("ATK", f.atk, 28)}
          ${statBar("DEF", f.def, 20)}
          ${statBar("SPD", f.speed, 20)}
        </div>
        <div class="pick">Select ${f.name}</div>`;
      card.addEventListener("click", () => startTournament(id));
      grid.appendChild(card);
    });

    const hint = $("#unlock-hint");
    if (Save.friezaUnlocked) {
      hint.textContent = "Frieza is unlocked. The tyrant fights for you now.";
    } else {
      hint.textContent = "Clear the tournament once to unlock Frieza.";
    }
  }

  function statBar(label, val, max) {
    const pct = Math.min(100, Math.round((val / max) * 100));
    return `<div class="statrow"><span>${label}</span><i><b style="width:${pct}%"></b></i></div>`;
  }

  // =========================================================
  //  TOURNAMENT FLOW
  // =========================================================
  function startTournament(playerId) {
    G.playerId = playerId;
    G.rung = 0;
    G.dragonBalls = 0;
    beginBattle();
  }

  function currentOpponent() { return TOURNAMENT_LADDER[G.rung]; }

  function beginBattle() {
    const opp = currentOpponent();
    G.player = makeCombatant(G.playerId, 1);
    G.enemy = makeCombatant(opp.id, opp.diff);
    G.player.ki = 25;
    G.log = [];
    G.playerPos = "bl";
    G.enemyPos = "tr";
    G.pendingMove = null;
    G.pendingPlayerPos = null;
    G.pendingAimPos = null;
    show("battle");
    renderBattle(true);
    logMsg(`Round ${G.rung + 1} of 7 — ${G.player.name} vs ${G.enemy.name}!`, "sys");
    logMsg(`Both fighters take their positions. Choose your move and aim wisely!`, "sys");
    G.busy = false;
    setControlsEnabled(true);
  }

  // =========================================================
  //  BATTLE RENDERING
  // =========================================================
  function renderBattle(full) {
    if (full) {
      $("#round-label").textContent = `Namek Tournament — Round ${G.rung + 1}/7`;
      renderBalls();
      buildFighterPanel("player", G.player);
      buildFighterPanel("enemy", G.enemy);
      buildControls();
    }
    updateBars();
    renderArenaGrid();
  }

  function renderBalls() {
    const wrap = $("#dragonballs");
    wrap.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const b = el("span", "dball" + (i < G.dragonBalls ? " got" : ""));
      b.textContent = i < G.dragonBalls ? i + 1 : "";
      wrap.appendChild(b);
    }
  }

  // Fighter stat panel — nameplate + HP/Ki bars only (avatar lives in the quad grid)
  function buildFighterPanel(side, c) {
    const panel = $("#" + side);
    panel.style.setProperty("--c", c.color);
    panel.style.setProperty("--a", c.aura);
    panel.innerHTML = `
      <div class="nameplate">
        <span class="nm">${c.name}</span>
        <span class="tl">${c.title}</span>
      </div>
      <div class="bars">
        <div class="bar hp"><label>HP</label><i><b></b></i><em></em></div>
        <div class="bar ki"><label>KI</label><i><b></b></i><em></em></div>
      </div>`;
  }

  // Build an avatar element to place inside a quadrant cell
  function buildAvatar(c, side) {
    const div = document.createElement("div");
    div.className = "avatar " + side + "-avatar";
    div.style.setProperty("--c", c.color);
    div.style.setProperty("--a", c.aura);
    if (c.ki >= c.special.kiCost) div.classList.add("charged");
    if (c.guarding) div.classList.add("guarding");
    // Short name (first word) fits the small circle
    const shortName = c.name.split(" ")[0];
    div.innerHTML = `<span class="aura"></span><span class="body">${shortName}</span><span class="fx"></span>`;
    return div;
  }

  // Render fighters in their current quadrant cells
  // mode: undefined = normal, "pos" = player picking move zone, "aim" = player picking aim zone
  function renderArenaGrid(mode) {
    QUADS.forEach((q) => {
      const cell = document.getElementById("q-" + q);

      // Clear dynamic children, keep .quad-label
      Array.from(cell.children).forEach((ch) => {
        if (!ch.classList.contains("quad-label")) ch.remove();
      });

      const hasPlayer = G.playerPos === q;
      const hasEnemy  = G.enemyPos === q;

      // Place avatars
      if (hasPlayer) cell.appendChild(buildAvatar(G.player, "player"));
      if (hasEnemy)  cell.appendChild(buildAvatar(G.enemy, "enemy"));

      // Reset classes then apply state
      cell.className = "quad";
      cell.onclick = null;

      if (hasPlayer && hasEnemy) cell.classList.add("has-both");
      else if (hasPlayer) cell.classList.add("has-player");
      else if (hasEnemy)  cell.classList.add("has-enemy");

      if (mode === "pos") {
        cell.classList.add("sel-pos");
        cell.onclick = () => onPositionPick(q);
      } else if (mode === "aim") {
        if (G.pendingPlayerPos === q) {
          cell.classList.add("pending-pos");
        } else {
          cell.classList.add("sel-aim");
          cell.onclick = () => onAimPick(q);
        }
        // Show "enemy here" hint on enemy's current cell
        if (hasEnemy) cell.classList.add("aim-enemy-here");
      }
    });
  }

  function updateBars() {
    [["player", G.player], ["enemy", G.enemy]].forEach(([side, c]) => {
      const panel = $("#" + side);
      if (!panel) return;
      const hpPct = Math.max(0, (c.hp / c.maxHp) * 100);
      const kiPct = Math.max(0, (c.ki / c.maxKi) * 100);
      panel.querySelector(".hp b").style.width = hpPct + "%";
      panel.querySelector(".ki b").style.width = kiPct + "%";
      panel.querySelector(".hp em").textContent = Math.max(0, Math.round(c.hp)) + "/" + c.maxHp;
      panel.querySelector(".ki em").textContent = Math.round(c.ki) + "/" + c.maxKi;
    });
  }

  function buildControls() {
    const bar = $("#controls");
    bar.innerHTML = "";
    const moves = [
      BASE_MOVES.melee,
      BASE_MOVES.kiBlast,
      BASE_MOVES.charge,
      BASE_MOVES.guard,
      G.player.special,
    ];
    moves.forEach((m) => {
      const isSpecial = m === G.player.special;
      const btn = el("button", "move-btn" + (isSpecial ? " special" : ""));
      btn.dataset.move = m.id;
      btn.innerHTML = `
        <span class="mv-name">${m.name}</span>
        <span class="mv-cost">${m.kiCost ? "−" + m.kiCost + " ki" : m.kiGain ? "+" + m.kiGain + " ki" : "&nbsp;"}</span>
        <span class="mv-desc">${m.desc}</span>`;
      btn.addEventListener("click", () => onPlayerMove(m));
      bar.appendChild(btn);
    });
  }

  function setControlsEnabled(on) {
    document.querySelectorAll(".move-btn").forEach((b) => {
      const moveId = b.dataset.move;
      const m = resolveMove(moveId, G.player);
      const affordable = G.player.ki >= (m.kiCost || 0);
      b.disabled = !on || !affordable;
      b.classList.toggle("cantafford", on && !affordable && m.kiCost > 0);
    });
  }

  function resolveMove(id, combatant) {
    if (id === combatant.special.id) return combatant.special;
    return BASE_MOVES[id];
  }

  function showPickPrompt(html) {
    const p = $("#pick-prompt");
    p.innerHTML = html;
    p.classList.remove("hidden");
  }

  function hidePickPrompt() {
    $("#pick-prompt").classList.add("hidden");
  }

  // =========================================================
  //  PLAYER TURN — 3-STEP SELECTION
  // =========================================================

  // Step 1: move selected → show position picker
  function onPlayerMove(move) {
    if (G.busy) return;
    if (G.player.ki < (move.kiCost || 0)) return;
    G.pendingMove = move;
    setControlsEnabled(false);
    showPickPrompt(
      `<b>${move.name}</b> selected — <span style="color:#80e0ff">which zone will you move to?</span>`
    );
    renderArenaGrid("pos");
  }

  // Step 2: position chosen → show aim picker (or execute if non-attack move)
  function onPositionPick(pos) {
    G.pendingPlayerPos = pos;
    const move = G.pendingMove;

    if (move.type === "charge" || move.type === "guard") {
      // No attack — execute immediately
      G.pendingAimPos = null;
      hidePickPrompt();
      executeRound();
      return;
    }

    const enemyZone = QUAD_LABELS[G.enemyPos];
    showPickPrompt(
      `<b>${move.name}</b> — <span style="color:var(--gold)">aim at which zone?</span>`
      + ` <small style="color:#ff8090">(enemy last seen: ${enemyZone})</small>`
    );
    renderArenaGrid("aim");
  }

  // Step 3: aim chosen → execute round
  function onAimPick(aimPos) {
    G.pendingAimPos = aimPos;
    hidePickPrompt();
    executeRound();
  }

  // =========================================================
  //  MOVEMENT ANIMATION
  // =========================================================

  // Fly both avatars from their current quadrants to their destination quadrants,
  // then call onComplete. Uses fixed-position clones so the transition crosses cells.
  function animateMovements(pFromPos, pToPos, eFromPos, eToPos, onComplete) {
    const tasks = [];

    if (pFromPos !== pToPos) {
      const av = document.querySelector(".player-avatar");
      if (av) tasks.push({ av, fromQ: pFromPos, toQ: pToPos });
    }
    if (eFromPos !== eToPos) {
      const av = document.querySelector(".enemy-avatar");
      if (av) tasks.push({ av, fromQ: eFromPos, toQ: eToPos });
    }

    if (tasks.length === 0) {
      // No movement — quick shake-in-place pulse on the avatars
      document.querySelectorAll(".player-avatar, .enemy-avatar").forEach((av) => {
        av.classList.add("stay-pulse");
        setTimeout(() => av.classList.remove("stay-pulse"), 350);
      });
      setTimeout(onComplete, 200);
      return;
    }

    const clones = [];

    tasks.forEach(({ av, fromQ, toQ }) => {
      const fromRect = av.getBoundingClientRect();
      const toCell   = document.getElementById("q-" + toQ);
      const toRect   = toCell.getBoundingClientRect();

      // Target: centred inside the destination cell
      const toCX = toRect.left + (toRect.width  - fromRect.width)  / 2;
      const toCY = toRect.top  + (toRect.height - fromRect.height) / 2;

      // Clone and pin at current screen position
      const clone = av.cloneNode(true);
      clone.style.cssText = [
        "position:fixed",
        `left:${fromRect.left}px`,
        `top:${fromRect.top}px`,
        `width:${fromRect.width}px`,
        `height:${fromRect.height}px`,
        "margin:0",
        "z-index:999",
        "pointer-events:none",
        "transition:left 0.38s cubic-bezier(0.4,0,0.2,1),top 0.38s cubic-bezier(0.4,0,0.2,1),opacity 0.1s ease 0.32s",
      ].join(";");
      document.body.appendChild(clone);
      clones.push(clone);

      // Hide the real avatar while clone flies
      av.style.opacity = "0";

      // Kick off the CSS transition on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clone.style.left = toCX + "px";
          clone.style.top  = toCY + "px";
          clone.style.opacity = "0"; // fade out just before landing
        });
      });
    });

    // After the flight: clean up clones and hand off to the resolve phase
    setTimeout(() => {
      clones.forEach((c) => c.remove());
      onComplete();
    }, 420);
  }

  // =========================================================
  //  SIMULTANEOUS ROUND RESOLUTION
  // =========================================================
  function executeRound() {
    G.busy = true;

    const pm   = G.pendingMove;
    const pPos = G.pendingPlayerPos;
    const pAim = G.pendingAimPos; // null for charge/guard

    // ---- Enemy AI chooses before positions update ----
    const em   = chooseEnemyMove();
    const ePos = chooseEnemyPosition();
    const eAim = (em.type === "charge" || em.type === "guard") ? null : chooseEnemyAim();

    // ---- Ki regen ----
    G.player.ki = clamp(G.player.ki + G.player.kiRegen, 0, G.player.maxKi);
    G.enemy.ki  = clamp(G.enemy.ki  + G.enemy.kiRegen,  0, G.enemy.maxKi);

    // ---- Save PREVIOUS exposed state (for damage calc) ----
    const playerWasExposed = G.player.exposed;
    const enemyWasExposed  = G.enemy.exposed;

    // ---- Apply this round's guard / charge / ki effects ----
    G.player.guarding = (pm.type === "guard");
    G.enemy.guarding  = (em.type === "guard");

    if (pm.type === "guard")  G.player.ki = clamp(G.player.ki + pm.kiGain, 0, G.player.maxKi);
    if (em.type === "guard")  G.enemy.ki  = clamp(G.enemy.ki  + em.kiGain,  0, G.enemy.maxKi);
    if (pm.type === "charge") G.player.ki = clamp(G.player.ki + pm.kiGain, 0, G.player.maxKi);
    if (em.type === "charge") G.enemy.ki  = clamp(G.enemy.ki  + em.kiGain,  0, G.enemy.maxKi);
    if (pm.kiCost) G.player.ki = clamp(G.player.ki - pm.kiCost, 0, G.player.maxKi);
    if (em.kiCost) G.enemy.ki  = clamp(G.enemy.ki  - em.kiCost,  0, G.enemy.maxKi);

    // Restore previous exposed so damage calc sees the correct value
    G.player.exposed = playerWasExposed;
    G.enemy.exposed  = enemyWasExposed;

    // ---- Pre-compute combat outcomes ----
    let pDmg = 0, pText = "", pFx = "none", pCrit = false;

    if (pm.type === "charge") {
      pText = `${G.player.name} powers up in ${QUAD_LABELS[pPos]}! Ki surges — guard is down.`;
      pFx = "charge";
    } else if (pm.type === "guard") {
      pText = `${G.player.name} moves to ${QUAD_LABELS[pPos]} and braces for impact.`;
      pFx = "guard";
    } else {
      if (pAim === ePos) {
        const res = computeDamage(G.player, G.enemy, pm);
        pDmg = res.dmg; pCrit = res.crit; pFx = res.fx;
        pText = `${G.player.name} strikes ${QUAD_LABELS[pAim]}! ` + res.text;
        if (pm.recoil) {
          G.player.hp = clamp(G.player.hp - pm.recoil, 0, G.player.maxHp);
          pText += ` Strain costs ${pm.recoil} HP.`;
        }
      } else {
        pText = `${G.player.name} fires at ${QUAD_LABELS[pAim]} — but ${G.enemy.name} moved to ${QUAD_LABELS[ePos]}! MISS!`;
        pFx = "miss";
      }
    }

    let eDmg = 0, eText = "", eFx = "none", eCrit = false;

    if (em.type === "charge") {
      eText = `${G.enemy.name} powers up in ${QUAD_LABELS[ePos]}! They're exposed.`;
      eFx = "charge";
    } else if (em.type === "guard") {
      eText = `${G.enemy.name} moves to ${QUAD_LABELS[ePos]} and guards.`;
      eFx = "guard";
    } else {
      if (eAim === pPos) {
        const res = computeDamage(G.enemy, G.player, em);
        eDmg = res.dmg; eCrit = res.crit; eFx = res.fx;
        eText = `${G.enemy.name} strikes ${QUAD_LABELS[eAim]}! ` + res.text;
        if (em.recoil) {
          G.enemy.hp = clamp(G.enemy.hp - em.recoil, 0, G.enemy.maxHp);
          eText += ` Strain costs ${em.recoil} HP.`;
        }
      } else {
        eText = `${G.enemy.name} fires at ${QUAD_LABELS[eAim]} — you dodged to ${QUAD_LABELS[pPos]}! MISS!`;
        eFx = "miss";
      }
    }

    // ---- PHASE 1: Animate both fighters flying to new zones ----
    const oldPlayerPos = G.playerPos;
    const oldEnemyPos  = G.enemyPos;

    animateMovements(oldPlayerPos, pPos, oldEnemyPos, ePos, () => {
      // ---- PHASE 2: Snap to new positions, apply damage ----
      G.playerPos = pPos;
      G.enemyPos  = ePos;

      G.enemy.hp  = clamp(G.enemy.hp  - pDmg, 0, G.enemy.maxHp);
      G.player.hp = clamp(G.player.hp - eDmg, 0, G.player.maxHp);

      G.player.exposed = (pm.type === "charge");
      G.enemy.exposed  = (em.type === "charge");

      logMsg(pText, "player");
      logMsg(eText, "enemy");

      renderArenaGrid();
      updateBars();

      if (pDmg > 0) playFX("player-avatar", "enemy-avatar", pm, { dmg: pDmg, crit: pCrit, fx: pFx });
      if (eDmg > 0) playFX("enemy-avatar",  "player-avatar", em, { dmg: eDmg, crit: eCrit, fx: eFx });

      // ---- PHASE 3: Check win/lose ----
      setTimeout(() => {
        if (isDead(G.enemy))  return onBattleWon();
        if (isDead(G.player)) return onBattleLost();
        G.busy = false;
        G.pendingMove = null;
        G.pendingPlayerPos = null;
        G.pendingAimPos = null;
        setControlsEnabled(true);
      }, 700);
    });
  }

  // =========================================================
  //  DAMAGE CALCULATION
  // =========================================================
  function computeDamage(attacker, defender, move) {
    const atkFactor = attacker.atk / 20;
    const defFactor = move.pierce ? 1 : 20 / (20 + defender.def);
    let dmg = move.power * atkFactor * defFactor;

    let guarded = false;
    if (defender.guarding && !move.pierce) {
      dmg *= 0.45;
      guarded = true;
    }
    let punished = false;
    if (defender.exposed) {
      dmg *= 1.5;
      punished = true;
    }
    const crit = rand() < 0.14;
    dmg *= 0.9 + rand() * 0.2;
    if (crit) dmg *= 1.6;

    dmg = Math.max(1, Math.round(dmg));

    let text = `${attacker.name} uses ${move.name} for ${dmg} damage.`;
    if (crit)     text = `⚡ CRITICAL! ` + text;
    if (guarded)  text += ` ${defender.name}'s guard softens the blow.`;
    if (punished) text += ` ${defender.name} was wide open!`;
    if (move.pierce) text += ` It pierces straight through!`;

    return { dmg, text, crit, fx: move.type === "melee" ? "hit" : "beam", guarded, punished };
  }

  // =========================================================
  //  ENEMY AI
  // =========================================================
  function chooseEnemyMove() {
    const e = G.enemy;
    const p = G.player;
    const hpRatio = e.hp / e.maxHp;

    if (e.ki >= e.special.kiCost) {
      const est = estimate(e, p, e.special);
      if (est >= p.hp || rand() < 0.55) return e.special;
    }
    if (p.exposed && e.ki >= BASE_MOVES.kiBlast.kiCost) return BASE_MOVES.kiBlast;
    if (e.ki < BASE_MOVES.kiBlast.kiCost) {
      if (hpRatio < 0.25 && rand() < 0.5) return BASE_MOVES.guard;
      return rand() < 0.7 ? BASE_MOVES.charge : BASE_MOVES.melee;
    }
    if (hpRatio < 0.35 && rand() < 0.3) return BASE_MOVES.guard;
    if (e.ki >= BASE_MOVES.kiBlast.kiCost && rand() < 0.5) return BASE_MOVES.kiBlast;
    return BASE_MOVES.melee;
  }

  // Enemy picks a zone to move to (tries to dodge the player's predicted aim)
  function chooseEnemyPosition() {
    // 40% stay put, 60% move to a random different zone
    if (rand() < 0.40) return G.enemyPos;
    const others = QUADS.filter((q) => q !== G.enemyPos);
    return others[Math.floor(rand() * others.length)];
  }

  // Enemy aims at player's current zone (65%) or a random zone (35%)
  // — the enemy predicts the player won't move, so moving is a valid dodge strategy
  function chooseEnemyAim() {
    if (rand() < 0.65) return G.playerPos;
    return QUADS[Math.floor(rand() * QUADS.length)];
  }

  function estimate(attacker, defender, move) {
    if (!move.power) return 0;
    const atkFactor = attacker.atk / 20;
    const defFactor = move.pierce ? 1 : 20 / (20 + defender.def);
    return move.power * atkFactor * defFactor;
  }

  // =========================================================
  //  WIN / LOSE
  // =========================================================
  function onBattleWon() {
    G.busy = true;
    setControlsEnabled(false);
    updateBars();
    G.dragonBalls++;
    renderBalls();
    logMsg(`${G.enemy.name} is down! You earn Dragon Ball #${G.dragonBalls}.`, "win");
    setTimeout(() => {
      if (G.rung >= TOURNAMENT_LADDER.length - 1) {
        onTournamentCleared();
      } else {
        showInterlude();
      }
    }, 900);
  }

  function onBattleLost() {
    G.busy = true;
    setControlsEnabled(false);
    updateBars();
    logMsg(`${G.player.name} has fallen... The tournament ends here.`, "lose");
    setTimeout(() => showResult(false), 900);
  }

  function showInterlude() {
    const next = TOURNAMENT_LADDER[G.rung + 1];
    const nf = FIGHTERS[next.id];
    show("interlude");
    $("#interlude").innerHTML = `
      <div class="card">
        <h2>Victory!</h2>
        <p class="db-line">Dragon Balls collected: <b>${G.dragonBalls} / 7</b></p>
        <div class="mini-balls">${miniBalls()}</div>
        <p>Next challenger steps onto the arena...</p>
        <div class="next-foe" style="--c:${nf.color};--a:${nf.aura}">
          <span class="orb"></span>
          <div><b>${nf.name}</b><i>${nf.title}</i></div>
        </div>
        <p class="foe-blurb">${nf.blurb}</p>
        <button class="big-btn" id="next-btn">Face ${nf.name}</button>
      </div>`;
    $("#next-btn").addEventListener("click", () => {
      G.rung++;
      beginBattle();
    });
  }

  function miniBalls() {
    let s = "";
    for (let i = 0; i < 7; i++) {
      s += `<span class="dball sm${i < G.dragonBalls ? " got" : ""}">${i < G.dragonBalls ? i + 1 : ""}</span>`;
    }
    return s;
  }

  function onTournamentCleared() {
    Save.addClear();
    const firstClear = !Save.friezaUnlocked;
    if (firstClear) Save.unlockFrieza();
    showResult(true, firstClear);
  }

  function showResult(won, firstClear) {
    show("result");
    const wrap = $("#result");
    if (won) {
      wrap.innerHTML = `
        <div class="card win-card">
          <h1>CHAMPION OF NAMEK</h1>
          <div class="mini-balls big">${miniBalls()}</div>
          <p>All seven Dragon Balls are yours. ${FIGHTERS[G.playerId].name} stands undefeated!</p>
          ${firstClear ? `<p class="unlock">🟣 <b>FRIEZA UNLOCKED!</b> The emperor now fights at your command.</p>` : ""}
          <p class="clears">Total clears: ${Save.clears}</p>
          <div class="btn-row">
            <button class="big-btn" id="again-btn">Play Again</button>
            <button class="big-btn ghost" id="menu-btn">Character Select</button>
          </div>
        </div>`;
    } else {
      wrap.innerHTML = `
        <div class="card lose-card">
          <h1>DEFEATED</h1>
          <p>You made it to Round ${G.rung + 1} and collected ${G.dragonBalls} Dragon Ball${G.dragonBalls === 1 ? "" : "s"}.</p>
          <p class="tip">Tip: move to a different zone after Power Up so the enemy misses you!</p>
          <div class="btn-row">
            <button class="big-btn" id="again-btn">Try Again</button>
            <button class="big-btn ghost" id="menu-btn">Character Select</button>
          </div>
        </div>`;
    }
    $("#again-btn").addEventListener("click", () => startTournament(G.playerId));
    $("#menu-btn").addEventListener("click", () => { renderSelect(); show("select"); });
  }

  // =========================================================
  //  BATTLE LOG + FX
  // =========================================================
  function logMsg(text, kind) {
    G.log.push({ text, kind });
    const box = $("#battle-log");
    if (!box) return;
    const line = el("div", "log-line " + (kind || ""), text);
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    while (box.children.length > 40) box.removeChild(box.firstChild);
  }

  // attackerClass / defenderClass are CSS class names like "player-avatar" / "enemy-avatar"
  function playFX(attackerClass, defenderClass, move, result) {
    const arena = $("#arena");
    if (result.dmg > 0) {
      arena.classList.remove("shake", "shake-hard");
      void arena.offsetWidth;
      arena.classList.add(result.crit ? "shake-hard" : "shake");

      const defAv = document.querySelector("." + defenderClass);
      if (defAv) {
        const dn = el("span", "dmg-float" + (result.crit ? " crit" : ""), "-" + result.dmg);
        defAv.appendChild(dn);
        setTimeout(() => dn.remove(), 900);
        defAv.classList.remove("hurt");
        void defAv.offsetWidth;
        defAv.classList.add("hurt");
      }
    }

    const attAv = document.querySelector("." + attackerClass);
    if (attAv) {
      const cls =
        result.fx === "beam"   ? "act-beam"   :
        result.fx === "charge" ? "act-charge" :
        result.fx === "guard"  ? "act-guard"  : "act-melee";
      attAv.classList.remove("act-melee", "act-beam", "act-charge", "act-guard");
      void attAv.offsetWidth;
      attAv.classList.add(cls);
    }
  }

  // =========================================================
  //  UTIL
  // =========================================================
  function isDead(c) { return c.hp <= 0; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rand() { return Math.random(); }

  // =========================================================
  //  BOOT
  // =========================================================
  function boot() {
    $("#start-btn").addEventListener("click", () => { renderSelect(); show("select"); });
    $("#back-title").addEventListener("click", () => show("title"));

    // Keyboard shortcut: keys 1–5 select a move (then player clicks quads for position/aim)
    document.addEventListener("keydown", (e) => {
      if (G.screen !== "battle" || G.busy) return;
      // Only allow move selection in the initial phase (not during pos/aim picking)
      if (G.pendingMove) return;
      const map = { "1": "melee", "2": "kiBlast", "3": "charge", "4": "guard", "5": "__special" };
      const which = map[e.key];
      if (!which) return;
      const m = which === "__special" ? G.player.special : BASE_MOVES[which];
      onPlayerMove(m);
    });

    show("title");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
