import type { School } from "./types";

/**
 * Career-education signals.
 *
 * Eduplana's editorial focus is career education, so the directory needs to
 * answer "does this school prepare a child for work?" — a question no Nigerian
 * school listing currently answers.
 *
 * We cannot claim to have assessed anybody. What we can do is read the
 * facilities, activities and clubs a school published and say, transparently,
 * which career indicators they point to. Every badge on the site is therefore
 * *derived and shown with its workings* — the profile lists the exact items
 * that earned each signal, and the copy says plainly that this is not an audit.
 *
 * When the backend can verify schools directly, `School.verified` becomes the
 * separate, stronger claim; see `isVerified` below. The two must never be
 * conflated in the UI: one is "they published this", the other is "we checked".
 */

export type SignalKey =
  | "ict"
  | "stem"
  | "enterprise"
  | "vocational"
  | "guidance"
  | "exposure"
  | "creative"
  | "agriculture";

export interface Signal {
  key: SignalKey;
  label: string;
  /** One line a parent can act on, not a definition. */
  blurb: string;
  /** Lowercase substrings matched against the school's published tags. */
  match: string[];
}

export const SIGNALS: Signal[] = [
  {
    key: "ict",
    label: "Digital & computing",
    blurb: "Computer rooms, coding, robotics — the baseline for almost every modern career.",
    match: ["ict", "computer", "coding", "programming", "software", "robotic", "technolog", "digital", "e-learning", "elearning"],
  },
  {
    key: "stem",
    label: "STEM clubs",
    blurb: "JETS, Young Engineers and science clubs, where subject knowledge turns into projects.",
    match: ["jets", "young engineer", "stem", "science club", "engineering", "mad science", "laborator"],
  },
  {
    key: "enterprise",
    label: "Enterprise & business",
    blurb: "Entrepreneurship clubs and business skills — for the many who will create their own work.",
    match: ["entrepreneur", "business", "enterprise", "innovat", "invention", "young farmers"],
  },
  {
    key: "vocational",
    label: "Vocational & technical",
    blurb: "Trades and practical skills: woodwork, tailoring, catering, technical drawing.",
    match: ["vocational", "technical drawing", "woodwork", "handiwork", "carpentr", "tailor", "sewing", "fashion", "catering", "culinary", "home economics", "home maker", "baking"],
  },
  {
    key: "guidance",
    label: "Careers guidance",
    blurb: "A counsellor or careers programme — someone whose job is helping a child choose.",
    match: ["career", "guidance", "counsel", "mentor"],
  },
  {
    key: "exposure",
    label: "Work exposure",
    blurb: "Excursions, industrial visits and trips that show pupils what real work looks like.",
    match: ["excursion", "field trip", "industrial", "internship", "placement", "work experience", "outing"],
  },
  {
    key: "creative",
    label: "Creative & media",
    blurb: "Graphic design, photography, animation and broadcast — a fast-growing employer.",
    match: ["graphic", "design", "photograph", "animation", "broadcast", "video", "media", "multimedia"],
  },
  {
    key: "agriculture",
    label: "Agriculture",
    blurb: "School farms and gardens, in a sector that still employs more Nigerians than any other.",
    match: ["agric", "farm", "garden", "horticulture"],
  },
];

const BY_KEY = new Map(SIGNALS.map((s) => [s.key, s]));

/**
 * Tokens must begin a word, not merely appear inside one.
 *
 * Plain substring matching is badly wrong here: "ict" matches "Diction Club"
 * and "Valedictory Service", "stem" matches "solar system" and "CCTV
 * Surveillance System". Prefix matching keeps every true hit — "Robotics" for
 * "robotic", "Farmers" for "farm", "Laboratory" for "laborator" — while
 * dropping the accidents, because none of those false positives has the token
 * at a word boundary.
 */
function matchesToken(text: string, token: string): boolean {
  let at = text.indexOf(token);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(text[at - 1])) return true;
    at = text.indexOf(token, at + 1);
  }
  return false;
}

export interface MatchedSignal {
  signal: Signal;
  /** The school's own published items that triggered this signal. */
  evidence: string[];
}

export type CareerTier = "strong" | "some" | "none";

export interface CareerProfile {
  matched: MatchedSignal[];
  count: number;
  tier: CareerTier;
}

/** Four of eight signals is the bar for the badge — about 17% of the directory. */
export const STRONG_THRESHOLD = 4;

const cache = new WeakMap<School, CareerProfile>();

/** Reads a school's published tags and reports the career signals they show. */
export function careerProfile(school: School): CareerProfile {
  const cached = cache.get(school);
  if (cached) return cached;

  const tags = [...school.facilities, ...school.activities, ...school.clubs];
  const matched: MatchedSignal[] = [];

  for (const signal of SIGNALS) {
    const evidence = tags.filter((tag) => {
      const needle = tag.toLowerCase();
      return signal.match.some((token) => matchesToken(needle, token));
    });
    // Dedupe: schools often list the same thing under activities and clubs.
    const unique = [...new Map(evidence.map((e) => [e.toLowerCase(), e])).values()];
    if (unique.length > 0) matched.push({ signal, evidence: unique });
  }

  const count = matched.length;
  const profile: CareerProfile = {
    matched,
    count,
    tier: count >= STRONG_THRESHOLD ? "strong" : count > 0 ? "some" : "none",
  };
  cache.set(school, profile);
  return profile;
}

/**
 * The stronger, separate claim: a human checked this school. Populated by the
 * backend once verification exists — never derived from published tags.
 */
export function isVerified(school: School): boolean {
  return school.verified === true;
}

export function signalFor(key: SignalKey): Signal | undefined {
  return BY_KEY.get(key);
}
