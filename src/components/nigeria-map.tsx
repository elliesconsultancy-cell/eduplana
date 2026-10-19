import { NIGERIA_PATH, NIGERIA_VIEWBOX, project } from "@/lib/nigeria-map";

/**
 * Nigeria, with a marker on each of the cities where Schoolsbase lists the
 * most schools, each sized by how many it lists in that city's state.
 *
 * The sizes are real: they come from the directory, not from a design. The
 * arcs are decoration (they join the markers to Lagos and Abuja) and say
 * nothing, which is why the whole graphic is hidden from assistive technology
 * apart from one sentence describing what it shows.
 */
const CITIES: Array<{ name: string; state: string; lon: number; lat: number; hub?: boolean; label?: boolean }> = [
  { name: "Lagos", state: "Lagos", lon: 3.38, lat: 6.52, hub: true, label: true },
  { name: "Abuja", state: "FCT (Abuja)", lon: 7.49, lat: 9.06, hub: true, label: true },
  { name: "Kano", state: "Kano", lon: 8.52, lat: 12.0, label: true },
  { name: "Port Harcourt", state: "Rivers", lon: 7.01, lat: 4.82, label: true },
  { name: "Ibadan", state: "Oyo", lon: 3.9, lat: 7.38 },
  { name: "Benin City", state: "Edo", lon: 5.63, lat: 6.34 },
  { name: "Enugu", state: "Enugu", lon: 7.5, lat: 6.45 },
  { name: "Jos", state: "Plateau", lon: 8.89, lat: 9.9 },
  { name: "Kaduna", state: "Kaduna", lon: 7.44, lat: 10.52 },
  { name: "Sokoto", state: "Sokoto", lon: 5.24, lat: 13.06 },
  { name: "Maiduguri", state: "Borno", lon: 13.15, lat: 11.85 },
];

export function NigeriaMap({ counts }: { counts: Map<string, number> }) {
  const { width, height } = NIGERIA_VIEWBOX;
  const points = CITIES.map((c) => ({ ...c, ...project(c.lon, c.lat), n: counts.get(c.state) ?? 0 }));
  const peak = Math.max(1, ...points.map((p) => p.n));
  // Area, not radius, follows the count, so a state with four times the schools
  // looks four times as big rather than sixteen.
  const radius = (n: number) => 4 + Math.sqrt(n / peak) * 26;
  const hubs = points.filter((p) => p.hub);

  /** A gentle arc between two points, bowed to the north so lines do not cross the markers. */
  const arc = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const bow = Math.hypot(b.x - a.x, b.y - a.y) * 0.22;
    return `M${a.x} ${a.y} Q${mx} ${my - bow} ${b.x} ${b.y}`;
  };

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Map of Nigeria. Markers show where Schoolsbase lists the most schools, with Lagos and Abuja the largest."
        className="h-auto w-full"
      >
        <defs>
          <radialGradient id="nm-glow">
            <stop offset="0%" stopColor="#8fc0ff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#4f9bff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2260b7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nm-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1d4f9e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#143a70" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <path d={NIGERIA_PATH} fill="url(#nm-land)" stroke="#6ba3e3" strokeOpacity="0.55" strokeWidth="2.2" strokeLinejoin="round" />

        <g aria-hidden fill="none" stroke="#a9cbf2" strokeOpacity="0.32" strokeWidth="1.6">
          {hubs.flatMap((h) =>
            points.filter((p) => p !== h && !(h.name === "Abuja" && p.name === "Lagos")).map((p) => (
              <path key={`${h.name}-${p.name}`} d={arc(h, p)} />
            )),
          )}
        </g>

        <g aria-hidden>
          {points.map((p) => (
            <g key={p.name}>
              <circle cx={p.x} cy={p.y} r={radius(p.n) * 2.4} fill="url(#nm-glow)" />
              <circle cx={p.x} cy={p.y} r={radius(p.n) * 0.62} fill="#ffffff" fillOpacity="0.95" />
            </g>
          ))}
          {points
            .filter((p) => p.label)
            .map((p) => (
              <text
                key={`${p.name}-label`}
                x={p.x + radius(p.n) * 0.62 + 12}
                y={p.y + 6}
                fill="#ffffff"
                fillOpacity="0.88"
                fontSize="27"
                fontWeight="600"
                style={{ fontFamily: "inherit" }}
              >
                {p.name}
              </text>
            ))}
        </g>
      </svg>
    </figure>
  );
}
