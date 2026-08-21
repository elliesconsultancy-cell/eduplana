import {
  Accessibility,
  Activity,
  Ambulance,
  Award,
  BadgeCheck,
  Baby,
  Bike,
  Blocks,
  BookOpen,
  BookOpenCheck,
  Bot,
  Brain,
  Brush,
  Bus,
  Calculator,
  Camera,
  ChefHat,
  Church,
  Clapperboard,
  Cpu,
  Drama,
  Droplets,
  Dumbbell,
  Feather,
  FlaskConical,
  Gamepad2,
  Globe,
  GraduationCap,
  Guitar,
  Hammer,
  HandHeart,
  Heart,
  Landmark,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  MapPinned,
  Medal,
  Megaphone,
  MessageCircle,
  Mic,
  Microscope,
  Music,
  Newspaper,
  Palette,
  PartyPopper,
  PenTool,
  Piano,
  Plane,
  Presentation,
  Puzzle,
  Salad,
  Scale,
  Scissors,
  Shield,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sprout,
  Stethoscope,
  Swords,
  Target,
  Tent,
  TreePine,
  Trophy,
  Users,
  Utensils,
  Video,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Facilities, activities and clubs arrive as free text typed by each school —
 * "Standard ICT Centre", "ICT/Computer lab", "Computer Studies" all mean the
 * same thing. Rather than clean the data (which would keep drifting), we match
 * on keywords at render time and fall back to a neutral chip when nothing hits.
 */

/** The chip palette. Deliberately wide so a long list reads as a spectrum. */
export type ChipTone =
  | "green"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "pink"
  | "rose"
  | "amber"
  | "lime"
  | "slate";

export const CHIP_TONES: Record<ChipTone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  teal: "bg-teal-50 text-teal-800 ring-teal-600/15",
  sky: "bg-sky-50 text-sky-800 ring-sky-600/15",
  indigo: "bg-indigo-50 text-indigo-800 ring-indigo-600/15",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/15",
  pink: "bg-pink-50 text-pink-800 ring-pink-600/15",
  rose: "bg-rose-50 text-rose-800 ring-rose-600/15",
  amber: "bg-amber-50 text-amber-900 ring-amber-600/20",
  lime: "bg-lime-50 text-lime-900 ring-lime-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/15",
};

/** Icon circle inside a chip — a touch stronger than the chip background. */
export const CHIP_ICON_TONES: Record<ChipTone, string> = {
  green: "bg-emerald-600/12 text-emerald-700",
  teal: "bg-teal-600/12 text-teal-700",
  sky: "bg-sky-600/12 text-sky-700",
  indigo: "bg-indigo-600/12 text-indigo-700",
  violet: "bg-violet-600/12 text-violet-700",
  pink: "bg-pink-600/12 text-pink-700",
  rose: "bg-rose-600/12 text-rose-700",
  amber: "bg-amber-600/15 text-amber-700",
  lime: "bg-lime-600/15 text-lime-700",
  slate: "bg-slate-600/12 text-slate-600",
};

interface Rule {
  /** Lowercase substrings; the first rule with any match wins. */
  match: string[];
  icon: LucideIcon;
  tone: ChipTone;
}

/**
 * Ordered most-specific first: "sick bay" must beat "bay", "swimming pool"
 * must beat "swimming" only where the two would disagree, and generic words
 * like "club" or "centre" sit at the bottom.
 */
const RULES: Rule[] = [
  // Sport and physical
  { match: ["swim", "pool", "aquatic"], icon: Waves, tone: "sky" },
  { match: ["football", "soccer", "basketball", "volleyball", "tennis", "cricket", "handball", "sport complex", "sports complex", "athletic", "track and field"], icon: Trophy, tone: "amber" },
  { match: ["taekwondo", "karate", "kung", "judo", "martial", "boxing", "fencing", "wrestling"], icon: Swords, tone: "rose" },
  { match: ["gym", "fitness", "physical education", "aerobic", "workout"], icon: Dumbbell, tone: "rose" },
  { match: ["cycl", "bicycle", "skating", "skate"], icon: Bike, tone: "amber" },
  { match: ["inter-house", "inter house", "house sport", "games", "playground", "play ground", "play area"], icon: Gamepad2, tone: "amber" },
  { match: ["ballet", "dance", "dancing", "choreograph"], icon: Sparkles, tone: "pink" },
  { match: ["scout", "girl guide", "boys brigade", "brigade", "cadet", "brownie"], icon: Tent, tone: "lime" },
  { match: ["golf", "table tennis", "badminton", "squash", "hockey", "rugby", "polo"], icon: Trophy, tone: "amber" },

  // Arts and performance
  { match: ["drama", "theatre", "theater", "acting"], icon: Drama, tone: "violet" },
  { match: ["piano", "keyboard", "orchestra", "band", "choir", "chorale"], icon: Piano, tone: "violet" },
  { match: ["guitar", "string", "violin"], icon: Guitar, tone: "violet" },
  { match: ["voice training", "vocal", "singing", "music"], icon: Music, tone: "violet" },
  { match: ["art and craft", "arts and craft", "art & craft", "fine art", "craft", "painting", "drawing", "art studio", "art room", "art club", "creative art", "visual art"], icon: Palette, tone: "pink" },
  { match: ["colour day", "color day"], icon: Palette, tone: "pink" },
  { match: ["costume", "cultural day", "cultural"], icon: Shirt, tone: "violet" },
  { match: ["party", "celebration", "carnival", "festival", "picnic", "end of year", "christmas", "graduation"], icon: PartyPopper, tone: "pink" },
  { match: ["photograph"], icon: Camera, tone: "indigo" },
  { match: ["film", "cinema", "movie", "animation"], icon: Clapperboard, tone: "indigo" },
  { match: ["media", "multimedia", "broadcast", "video", "youtube", "vlog"], icon: Video, tone: "indigo" },
  { match: ["press", "journal", "newsletter", "magazine", "editorial"], icon: Newspaper, tone: "slate" },
  { match: ["fashion", "sewing", "tailor", "textile", "knitting"], icon: Scissors, tone: "pink" },
  { match: ["design", "graphic"], icon: PenTool, tone: "indigo" },

  // Technology and science
  { match: ["robotic", "robot"], icon: Bot, tone: "indigo" },
  { match: ["coding", "programming", "software", "computer science", "stem", "steam"], icon: Cpu, tone: "indigo" },
  { match: ["whiteboard", "white board", "smart board", "smartboard", "projector", "interactive board"], icon: Presentation, tone: "sky" },
  { match: ["lego", "building block", "construction set"], icon: Blocks, tone: "amber" },
  { match: ["ict", "computer", "digital", "technolog"], icon: Laptop, tone: "sky" },
  { match: ["internet", "wifi", "wi-fi", "e-learning", "elearning", "online"], icon: Wifi, tone: "sky" },
  { match: ["laborator", "science lab", "chemistry", "physics", "biology"], icon: FlaskConical, tone: "teal" },
  { match: ["science", "microscope", "research"], icon: Microscope, tone: "teal" },
  { match: ["math", "arithmetic", "abacus", "numeracy"], icon: Calculator, tone: "indigo" },
  { match: ["invention", "innovat", "entrepreneur", "enterprise", "business"], icon: Lightbulb, tone: "amber" },

  // Academic and enrichment
  { match: ["librar", "reading", "book club", "literacy"], icon: BookOpen, tone: "amber" },
  { match: ["debate", "public speaking", "speech", "toastmaster", "elocution"], icon: Megaphone, tone: "rose" },
  { match: ["french", "language", "spanish", "arabic", "chinese", "mandarin", "yoruba", "igbo", "hausa", "foreign lang"], icon: Languages, tone: "teal" },
  { match: ["quiz", "spelling", "olympiad", "competition", "contest"], icon: Award, tone: "amber" },
  { match: ["prize", "award", "valedict", "honour roll", "honor roll"], icon: Trophy, tone: "amber" },
  { match: ["jets", "young engineer", "engineer"], icon: Cpu, tone: "indigo" },
  { match: ["scrabble", "chess", "puzzle", "sudoku", "draught"], icon: Puzzle, tone: "violet" },
  { match: ["creative writing", "writing", "poetry", "literary"], icon: Feather, tone: "violet" },
  { match: ["excursion", "field trip", "outing", "tour"], icon: MapPinned, tone: "lime" },
  { match: ["foreign trip", "international trip", "abroad", "exchange programme"], icon: Plane, tone: "sky" },
  { match: ["career", "mentor", "counsel", "guidance"], icon: Target, tone: "teal" },
  { match: ["leadership", "prefect", "student council", "model united"], icon: Medal, tone: "amber" },
  { match: ["montessori", "early years", "creche", "crèche", "nursery", "daycare", "day care", "toddler"], icon: Baby, tone: "pink" },
  { match: ["special need", "inclusive", "learning support", "disabilit"], icon: Accessibility, tone: "teal" },
  { match: ["gifted", "talented", "enrichment", "after school", "extra lesson", "remedial"], icon: Brain, tone: "violet" },
  { match: ["boarding", "hostel", "dormitor"], icon: GraduationCap, tone: "indigo" },

  // Faith and values
  { match: ["chapel", "church", "mosque", "prayer", "worship", "bible", "quran", "islamic", "christian", "religio", "moral", "scripture"], icon: Church, tone: "amber" },
  { match: ["charity", "outreach", "community service", "volunteer", "red cross"], icon: HandHeart, tone: "rose" },
  { match: ["debate society", "law", "mock trial", "civic"], icon: Scale, tone: "slate" },

  // Environment and life skills
  { match: ["garden", "agricult", "farm", "horticulture", "green club"], icon: Sprout, tone: "lime" },
  { match: ["environment", "climate", "recycl", "conservation", "nature"], icon: Leaf, tone: "lime" },
  { match: ["cook", "culinary", "catering", "baking", "home economics", "home maker", "homemaker"], icon: ChefHat, tone: "amber" },
  { match: ["power supply", "generator", "solar", "electricity", "inverter"], icon: Zap, tone: "amber" },
  { match: ["water", "fountain", "borehole", "plumbing"], icon: Droplets, tone: "sky" },
  { match: ["bookshop", "book shop", "bookstore"], icon: BookOpen, tone: "amber" },
  { match: ["woodwork", "technical drawing", "workshop", "vocational", "handiwork", "carpentr"], icon: Hammer, tone: "slate" },
  { match: ["etiquette", "grooming", "personal development", "life skill", "soft skill"], icon: Shirt, tone: "pink" },
  { match: ["park", "field", "green area", "landscape", "botanical"], icon: TreePine, tone: "lime" },

  // Care, safety and facilities
  { match: ["sick bay", "clinic", "infirmary", "nurse", "medical", "health"], icon: Stethoscope, tone: "rose" },
  { match: ["first aid", "ambulance", "emergency"], icon: Ambulance, tone: "rose" },
  { match: ["cctv", "security", "safety", "gated", "guard", "fire"], icon: ShieldCheck, tone: "teal" },
  { match: ["lunch", "meal", "canteen", "cafeteria", "feeding", "dining", "food"], icon: Utensils, tone: "amber" },
  { match: ["nutrition", "diet", "healthy eating"], icon: Salad, tone: "lime" },
  { match: ["transport", "bus", "shuttle", "school run", "pick up", "pickup"], icon: Bus, tone: "amber" },
  { match: ["hall", "auditorium", "multipurpose", "multi purpose", "assembly"], icon: Landmark, tone: "slate" },
  { match: ["chat", "counselling", "pastoral", "wellbeing", "well-being"], icon: MessageCircle, tone: "teal" },
  { match: ["parent", "pta", "family", "community"], icon: Users, tone: "teal" },
  { match: ["scholarship", "bursary", "discount", "grant"], icon: BadgeCheck, tone: "green" },
  { match: ["accredit", "certified", "affiliat", "member"], icon: Shield, tone: "green" },
  { match: ["curriculum", "syllabus", "academic", "exam", "assessment"], icon: BookOpenCheck, tone: "green" },
  { match: ["global", "international", "world", "cambridge", "british", "american", "ib "], icon: Globe, tone: "sky" },
  { match: ["care", "love", "nurtur", "welfare"], icon: Heart, tone: "rose" },
  { match: ["paint", "decor", "beauty"], icon: Brush, tone: "pink" },
  { match: ["activity", "extracurricular", "extra-curricular", "club", "society"], icon: Activity, tone: "teal" },
];

const FALLBACKS: Array<{ icon: LucideIcon; tone: ChipTone }> = [
  { icon: Sparkles, tone: "teal" },
  { icon: Activity, tone: "violet" },
  { icon: Award, tone: "amber" },
  { icon: Target, tone: "indigo" },
  { icon: Mic, tone: "pink" },
];

/**
 * Tokens must begin a word, not merely appear inside one — otherwise "ict"
 * matches "Diction Club" and "stem" matches "solar system". Every genuine hit
 * survives, because real matches ("Robotics", "Laboratory", "Farmers") all
 * have the token at a word boundary.
 */
function matchesToken(text: string, token: string): boolean {
  let at = text.indexOf(token);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(text[at - 1])) return true;
    at = text.indexOf(token, at + 1);
  }
  return false;
}

/** Stable per-label pick so the same label always gets the same fallback. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export interface ChipMeta {
  icon: LucideIcon;
  tone: ChipTone;
  /** False when no keyword rule hit and a generic icon was assigned. */
  matched: boolean;
}

const cache = new Map<string, ChipMeta>();

/** Icon and colour for a free-text facility, activity or club label. */
export function chipFor(label: string): ChipMeta {
  const cached = cache.get(label);
  if (cached) return cached;

  const needle = label.toLowerCase();
  const rule = RULES.find((r) => r.match.some((token) => matchesToken(needle, token)));
  const meta: ChipMeta = rule
    ? { icon: rule.icon, tone: rule.tone, matched: true }
    : { ...FALLBACKS[hash(needle) % FALLBACKS.length], matched: false };

  cache.set(label, meta);
  return meta;
}
