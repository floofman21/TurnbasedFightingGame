# Dragon Ball Z Tournament

A turn-based fighting game prototype, inspired by the classic browser game
[*Dragon Ball Z Tournament*](https://toonami.fandom.com/wiki/Dragon_Ball_Z_Tournament)
(Cartoon Network, 2001). Pick a fighter, climb a 7-round martial-arts ladder on
Namek, and collect all seven Dragon Balls — one per victory. Clear it once to
unlock the emperor himself, **Frieza**.

The whole thing is **dependency-free vanilla HTML/CSS/JS**. There's no build
step and nothing to install.

## Play it

Just open `index.html` in any modern browser.

```bash
# from the project root, either:
open index.html            # macOS
xdg-open index.html        # Linux

# ...or serve it (recommended so localStorage/unlocks persist cleanly):
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How it plays

You and your opponent trade turns. Whoever has the higher **Speed** stat acts
first each round. Every fight is a mix of resource management (Ki) and reading
your opponent.

### Moves

| Move | Effect |
| --- | --- |
| **Melee Rush** | Reliable damage, builds a little Ki. Costs nothing. |
| **Ki Blast** | Ranged energy hit — stronger than melee, spends Ki. |
| **Power Up** | Restores a big chunk of Ki, but leaves you **exposed**: the next hit you take deals +50%. |
| **Guard** | Halves the next incoming hit and recovers a little Ki. |
| **Special** | Each fighter's signature ultimate (Kamehameha, Final Flash, Destructo Disc…). Big Ki cost, big payoff. Some pierce through Guard. |

Keys **1–5** map to the five moves during battle.

### The mind game

The heart of the combat is the **Power Up ↔ Guard ↔ attack** triangle:

- **Power Up** fuels your specials but drops your guard — punish an opponent who
  does it, and don't do it while they can hit hard.
- **Guard** blunts a big attack, but wastes a turn if they just charge or poke.
- Piercing specials (Destructo Disc, Special Beam Cannon) ignore Guard entirely.

## Roster

Eight starters, each with a distinct stat profile and signature special:

Goku · Vegeta · Gohan · Piccolo · Krillin · Tien · Yamcha · Trunks
— plus **Frieza**, unlocked after your first tournament clear.

## Tournament ladder

Seven opponents on Namek, in ramping order of difficulty. Win each to claim a
Dragon Ball; collect all seven to become Champion of Namek. Progress and the
Frieza unlock are saved in your browser via `localStorage`.

## Project layout

```
index.html          # markup + screen containers
css/style.css       # all styling, animations, and DBZ flavor
js/characters.js    # data only: fighters, moves, the ladder
js/game.js          # combat engine, AI, tournament flow, save system
```

`characters.js` is intentionally pure data, so you can add a fighter or retune
balance without touching the engine. Tweak a fighter's `hp/atk/def/speed/kiRegen`
or their `special`, and it's immediately playable.

## Ideas for expansion

- Sprite/art assets in place of the CSS energy-orb avatars
- Sound effects and background music
- Difficulty settings and a survival/endless mode
- Transformations (Super Saiyan) as a mid-battle Ki-gated state
- A proper bracket view instead of a linear ladder
