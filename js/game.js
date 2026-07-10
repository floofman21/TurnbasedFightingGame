/* ============================================================
 * DBZ Tournament — Combat Engine & Game Flow
 * ------------------------------------------------------------
 * Turn-based combat with a light rock-paper-scissors layer:
 *   - Melee / Ki Blast deal damage.
 *   - Power Up restores ki but leaves you EXPOSED (next hit +50%).
 *   - Guard halves the next incoming hit.
 *   - Specials are big-ki ultimates; some pierce guard.
 * Whoever has higher Speed acts first each round. The player
 * climbs a 7-fighter Namek ladder, earning a Dragon Ball per win.
 * ==========================================================*/

(function () {
  "use strict";

  const SAVE_KEY = "dbzt_save_v1";

  // ---- Persistent progress (unlocks) -----------------------
  const Save = {
    load() {
      try {
        return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      } catch (_) {
        return {};
      }
    },
    write(data) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (_) {}
    },
    get friezaUnlocked() {
      return !!this.load().friezaUnlocked;
    },
    unlockFrieza() {
      const d = this.load();
      d.friezaUnlocked = true;
      this.write(d);
    },
    get clears() {
      return this.load().clears || 0;
    },
    addClear() {
      const d = this.load();
      d.clears = (d.clears || 0) + 1;
      this.write(d);
    },
  };

  // ---- Central game state ----------------------------------
  const G = {
    screen: "title",
    playerId: null,
    rung: 0, // index into TOURNAMENT_LADDER
    dragonBalls: 0,
    player: null, // live combatant
    enemy: null, // live combatant
    busy: false, // input lock during animations/AI
    log: [],
  };

  // A "combatant" wraps a fighter definition with live battle stats.
  function makeCombatant(fighterId, diff = 1) {
    const f = FIGHTERS[fighterId];
    const scale = diff;
    return {
      id: f.id,
      name: f.name,
      title: f.title,
      color: f.color,
      aura: f.aura,
      maxHp: Math.round(f.hp * scale),
      hp: Math.round(f.hp * scale),
      ki: 0,
      maxKi: 100,
      atk: f.atk * scale,
      def: f.def * scale,
      speed: f.speed,
      kiRegen: f.kiRegen,
      special: f.special,
      // transient flags cleared each of the combatant's turns
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

    // Unlock hint
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

  function currentOpponent() {
    return TOURNAMENT_LADDER[G.rung];
  }

  function beginBattle() {
    const opp = currentOpponent();
    G.player = makeCombatant(G.playerId, 1);
    G.enemy = makeCombatant(opp.id, opp.diff);
    // Player starts with a little ki so specials feel reachable.
    G.player.ki = 25;
    G.log = [];
    show("battle");
    renderBattle(true);
    logMsg(`Round ${G.rung + 1} of 7 — ${G.player.name} vs ${G.enemy.name}!`, "sys");
    logMsg(faster().name + " is faster and will strike first.", "sys");
    setControlsEnabled(true);
    G.busy = false;
    // If enemy is faster, they open the round.
    if (faster() === G.enemy) {
      lockAndEnemyTurn();
    }
  }

  function faster() {
    return G.player.speed >= G.enemy.speed ? G.player : G.enemy;
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
      </div>
      <div class="avatar" id="${side}-avatar">
        <span class="aura"></span>
        <span class="body">${c.name}</span>
        <span class="fx" id="${side}-fx"></span>
      </div>`;
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
      const av = panel.querySelector(".avatar");
      av.classList.toggle("guarding", c.guarding);
      av.classList.toggle("charged", c.ki >= c.special.kiCost);
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

  // =========================================================
  //  TURN RESOLUTION
  // =========================================================
  function onPlayerMove(move) {
    if (G.busy) return;
    if (G.player.ki < (move.kiCost || 0)) return;
    G.busy = true;
    setControlsEnabled(false);
    performTurn(G.player, G.enemy, move, "player", () => {
      if (isDead(G.enemy)) return onBattleWon();
      // Enemy responds after a beat.
      setTimeout(lockAndEnemyTurn, 620);
    });
  }

  function lockAndEnemyTurn() {
    G.busy = true;
    setControlsEnabled(false);
    const move = chooseEnemyMove();
    // brief "thinking" beat
    setTimeout(() => {
      performTurn(G.enemy, G.player, move, "enemy", () => {
        if (isDead(G.player)) return onBattleLost();
        G.busy = false;
        setControlsEnabled(true);
      });
    }, 520);
  }

  // Apply a move from attacker to defender, then run visual FX and cb.
  function performTurn(attacker, defender, move, side, cb) {
    // Regen a trickle of ki at the top of one's own turn.
    attacker.ki = clamp(attacker.ki + attacker.kiRegen, 0, attacker.maxKi);

    // Clear attacker's own transient guard as they commit to an action
    // (guarding only protects until you next act).
    const wasGuarding = attacker.guarding;
    attacker.guarding = false;

    let result = { dmg: 0, text: "", crit: false, fx: "hit" };

    switch (move.type) {
      case "charge":
        attacker.ki = clamp(attacker.ki + move.kiGain, 0, attacker.maxKi);
        attacker.exposed = true; // dropped guard — punished if hit next
        result.text = `${attacker.name} powers up! Ki surges — but their guard is down.`;
        result.fx = "charge";
        break;

      case "guard":
        attacker.guarding = true;
        attacker.ki = clamp(attacker.ki + move.kiGain, 0, attacker.maxKi);
        result.text = `${attacker.name} braces for impact.`;
        result.fx = "guard";
        break;

      default: {
        // damaging move (melee / ki / special)
        if (move.kiCost) attacker.ki = clamp(attacker.ki - move.kiCost, 0, attacker.maxKi);
        result = computeDamage(attacker, defender, move);
        defender.hp = clamp(defender.hp - result.dmg, 0, defender.maxHp);
        // recoil specials (Tri-Beam)
        if (move.recoil) {
          attacker.hp = clamp(attacker.hp - move.recoil, 0, attacker.maxHp);
          result.text += ` The strain costs ${attacker.name} ${move.recoil} HP.`;
        }
        break;
      }
    }

    // Attacker acting clears their exposed flag AFTER this resolves next turn;
    // exposed only matters while it's set when THEY get hit, so clear on their action.
    if (move.type !== "charge") attacker.exposed = false;

    logMsg(result.text, side);
    playFX(side, defender === G.player ? "player" : "enemy", move, result);
    updateBars();
    setTimeout(cb, 560);
  }

  function computeDamage(attacker, defender, move) {
    // Base scaled by attacker ATK vs defender DEF.
    const atkFactor = attacker.atk / 20;
    const defFactor = move.pierce ? 1 : 20 / (20 + defender.def);
    let dmg = move.power * atkFactor * defFactor;

    // Guard halves non-piercing hits.
    let guarded = false;
    if (defender.guarding && !move.pierce) {
      dmg *= 0.45;
      guarded = true;
    }
    // Exposed (just charged) defenders eat +50%.
    let punished = false;
    if (defender.exposed) {
      dmg *= 1.5;
      punished = true;
    }
    // Variance + crits.
    const crit = rand() < 0.14;
    dmg *= 0.9 + rand() * 0.2;
    if (crit) dmg *= 1.6;

    dmg = Math.max(1, Math.round(dmg));

    let text = `${attacker.name} uses ${move.name} for ${dmg} damage.`;
    if (crit) text = `⚡ CRITICAL! ` + text;
    if (guarded) text += ` ${defender.name}'s guard softens the blow.`;
    if (punished) text += ` ${defender.name} was wide open!`;
    if (move.pierce) text += ` It pierces straight through!`;

    return { dmg, text, crit, fx: move.type === "melee" ? "hit" : "beam", guarded, punished };
  }

  // =========================================================
  //  ENEMY AI — simple but reactive
  // =========================================================
  function chooseEnemyMove() {
    const e = G.enemy;
    const p = G.player;
    const hpRatio = e.hp / e.maxHp;

    // Finish if a special would likely end it.
    if (e.ki >= e.special.kiCost) {
      const est = estimate(e, p, e.special);
      if (est >= p.hp || rand() < 0.55) return e.special;
    }
    // Punish an exposed player hard.
    if (p.exposed && e.ki >= BASE_MOVES.kiBlast.kiCost) return BASE_MOVES.kiBlast;
    // Low ki? charge up, unless dangerously low HP (then guard/attack).
    if (e.ki < BASE_MOVES.kiBlast.kiCost) {
      if (hpRatio < 0.25 && rand() < 0.5) return BASE_MOVES.guard;
      return rand() < 0.7 ? BASE_MOVES.charge : BASE_MOVES.melee;
    }
    // Otherwise mix melee / ki, occasionally guard when hurt.
    if (hpRatio < 0.35 && rand() < 0.3) return BASE_MOVES.guard;
    if (e.ki >= BASE_MOVES.kiBlast.kiCost && rand() < 0.5) return BASE_MOVES.kiBlast;
    return BASE_MOVES.melee;
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
    for (let i = 0; i < 7; i++) s += `<span class="dball sm${i < G.dragonBalls ? " got" : ""}">${i < G.dragonBalls ? i + 1 : ""}</span>`;
    return s;
  }

  function onTournamentCleared() {
    Save.addClear();
    const firstClear = !Save.friezaUnlocked;
    if (firstClear) Save.unlockFrieza();
    show("result");
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
          <p class="tip">Tip: bait a Power Up out of your foe, then punish while they're exposed.</p>
          <div class="btn-row">
            <button class="big-btn" id="again-btn">Try Again</button>
            <button class="big-btn ghost" id="menu-btn">Character Select</button>
          </div>
        </div>`;
    }
    $("#again-btn").addEventListener("click", () => startTournament(G.playerId));
    $("#menu-btn").addEventListener("click", () => {
      renderSelect();
      show("select");
    });
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
    // keep DOM light
    while (box.children.length > 40) box.removeChild(box.firstChild);
  }

  function playFX(attackerSide, defenderSide, move, result) {
    const arena = $("#arena");
    if (result.dmg > 0) {
      arena.classList.remove("shake", "shake-hard");
      void arena.offsetWidth; // restart animation
      arena.classList.add(result.crit ? "shake-hard" : "shake");
      // floating damage number over defender
      const av = $("#" + defenderSide + "-avatar");
      if (av) {
        const dn = el("span", "dmg-float" + (result.crit ? " crit" : ""), "-" + result.dmg);
        av.appendChild(dn);
        setTimeout(() => dn.remove(), 900);
        av.classList.remove("hurt");
        void av.offsetWidth;
        av.classList.add("hurt");
      }
    }
    // attacker action flash
    const aav = $("#" + attackerSide + "-avatar");
    if (aav) {
      aav.classList.remove("act-melee", "act-beam", "act-charge", "act-guard");
      void aav.offsetWidth;
      const cls =
        result.fx === "beam" ? "act-beam" :
        result.fx === "charge" ? "act-charge" :
        result.fx === "guard" ? "act-guard" : "act-melee";
      aav.classList.add(cls);
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
    $("#start-btn").addEventListener("click", () => {
      renderSelect();
      show("select");
    });
    $("#back-title").addEventListener("click", () => show("title"));
    // keyboard: number keys during battle
    document.addEventListener("keydown", (e) => {
      if (G.screen !== "battle" || G.busy) return;
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
