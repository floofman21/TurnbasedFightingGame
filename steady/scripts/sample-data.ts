// The prototype's sample org, ported call-for-call from its generator so the
// seeded data (and therefore the KPIs) match the prototype exactly.
// Local and preview only — never import this from app code.

import { computeIndices, type Answers } from "../lib/scoring";

export const SAMPLE_WEEKS = 8;

export const SAMPLE_DEPARTMENTS: Record<string, { teams: string[]; stress: number; energy: number }> = {
  Engineering: { teams: ["Platform", "Mobile", "Data"], stress: 0.35, energy: -0.1 },
  Design: { teams: ["Product Design", "Research"], stress: 0.0, energy: 0.2 },
  Product: { teams: ["Core PM"], stress: 0.3, energy: 0.1 },
  Sales: { teams: ["Enterprise", "Mid-Market"], stress: 0.8, energy: -0.2 },
  Marketing: { teams: ["Growth", "Brand"], stress: 0.2, energy: 0.1 },
  HR: { teams: ["People Ops"], stress: 0.45, energy: -0.15 },
  Operations: { teams: ["Support", "Finance Ops"], stress: 0.5, energy: -0.3 },
};

const NAMES = [
  "Priya Sharma", "Riya Mavi", "Emma Davis", "James Wilson", "Shreya Verma", "Sarah Johnson",
  "Sofia Davis", "Jackson Lee", "Isabella Nguyen", "Marcus Reed", "Aiden Park", "Leila Haddad",
  "Tomás Ortega", "Hannah Kim", "Daniel Okafor", "Grace Liu", "Noah Bennett", "Amara Mensah",
  "Lucas Moreau", "Chloe Turner", "Ethan Brooks", "Mei Tanaka", "Omar Siddiqui", "Zoe Fischer",
  "Mateo Alvarez", "Ava Robinson", "Kwame Asante", "Nina Petrova", "Ryan Gallagher", "Fatima Zahra",
  "Owen Price", "Lily Chen", "Samuel Adeyemi", "Elena Rossi", "Jordan Hayes", "Maya Patel",
  "Victor Lindqvist", "Harper Collins", "Ibrahim Yusuf", "Clara Novak", "Theo Martins", "Ruby Walsh",
];

const NOTES = {
  good: [
    "Shipped the onboarding revamp, team energy is high.",
    "Good week. Pairing sessions are really helping.",
    "Finally had a quiet focus day, felt great.",
    "Loved the offsite planning session.",
    "Workload feels balanced after reprioritizing.",
  ],
  mid: [
    "Busy but manageable. A few too many meetings.",
    "Context switching between two projects is tiring.",
    "Waiting on approvals is slowing me down.",
    "Fine overall, a bit tired from travel.",
    "Okay week. Would like clearer priorities for Q4.",
  ],
  bad: [
    "Quarter-end targets are making this a very long week.",
    "On-call was rough, two late nights in a row.",
    "Feeling stretched across three launches at once.",
    "Hard to switch off in the evenings lately.",
    "Team is short-staffed and the backlog keeps growing.",
  ],
};

/** mulberry32, identical to the prototype's `rng`. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SampleCheckin = Answers & { note: string; shared: boolean; day: number };
export type SamplePerson = {
  index: number;
  employeeCode: string;
  name: string;
  email: string;
  dept: string;
  team: string;
  /** Oldest first; null = missed that week. Index SAMPLE_WEEKS - 1 is the current week. */
  checkins: (SampleCheckin | null)[];
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function emailFor(name: string, domain: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${slug}@${domain}`;
}

export function generateSamplePeople(emailDomain = "example.com"): SamplePerson[] {
  const R = rng(20261022);
  const pick = <T,>(list: T[]) => list[Math.floor(R() * list.length)];
  const deptKeys = Object.keys(SAMPLE_DEPARTMENTS);

  return NAMES.map((name, i) => {
    const dept = deptKeys[i % deptKeys.length];
    const D = SAMPLE_DEPARTMENTS[dept];
    // Object-literal order matters: it fixes the order of R() calls.
    const base: Answers = {
      mood: 3.4 + R() * 1.2 - 0.4,
      energy: 3.3 + R() * 1.1 - 0.3 + D.energy,
      stress: 2.4 + R() * 1.2 + D.stress,
      workload: 2.6 + R() * 1.1 + D.stress * 0.8,
      belonging: 3.4 + R() * 1.3 - 0.3,
    };
    const drift = (R() - 0.55) * 0.12;
    const checkins: (SampleCheckin | null)[] = [];
    for (let w = 0; w < SAMPLE_WEEKS; w++) {
      const miss = R() < (i % 9 === 4 ? 0.45 : 0.12);
      if (miss) {
        checkins.push(null);
        continue;
      }
      const s = (k: keyof Answers) =>
        clamp(
          Math.round(
            base[k] +
              (R() - 0.5) * 1.4 +
              (k === "stress" || k === "workload" ? -drift : drift) * w * (k === "belonging" ? 0.5 : 1) * -1 * -1,
          ),
          1,
          5,
        );
      const answers: Answers = {
        mood: s("mood"),
        energy: s("energy"),
        stress: s("stress"),
        workload: s("workload"),
        belonging: s("belonging"),
      };
      const shared = R() < 0.7;
      const b = computeIndices(answers).burnout;
      const note = R() < 0.55 ? pick(b >= 60 ? NOTES.bad : b >= 40 ? NOTES.mid : NOTES.good) : "";
      const day = Math.floor(R() * 5);
      checkins.push({ ...answers, shared, note, day });
    }
    return {
      index: i,
      employeeCode: `EMP-${1041 + i * 7}`,
      name,
      email: emailFor(name, emailDomain),
      dept,
      team: D.teams[i % D.teams.length],
      checkins,
    };
  });
}
