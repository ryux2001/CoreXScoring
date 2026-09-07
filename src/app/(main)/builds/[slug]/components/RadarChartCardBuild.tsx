"use client";

import { useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Gamepad2,
  Gauge,
  Info,
  Leaf,
  PlugZap,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { getBuildNotes, type Build } from "@/lib/scoringBuilds";

interface RadarChartCardBuildProps {
  build: Build;
  currency?: string;
  onSwitchView?: () => void;
}

type BuildNotes = ReturnType<typeof getBuildNotes>;
type ActiveTooltip = { name: string; score: number; x: number; y: number; cx: number; cy: number };

type BuildMetric = {
  key: keyof BuildNotes;
  label: string;
  icon: typeof Zap;
};

const buildMetrics: BuildMetric[] = [
  { key: "potencia", label: "Potencia", icon: Zap },
  { key: "productividad", label: "Productividad", icon: BriefcaseBusiness },
  { key: "gaming", label: "Gaming", icon: Gamepad2 },
  { key: "eficiencia", label: "Eficiencia", icon: Leaf },
  { key: "cuelloBotella", label: "Cuello botella", icon: Gauge },
  { key: "compatibilidad", label: "Compatibilidad", icon: PlugZap },
  { key: "actualizaciones", label: "Actualizaciones", icon: RefreshCw },
  { key: "calidadPrecio", label: "Calidad precio", icon: BadgeDollarSign },
];

const subscribeToMount = () => () => {};
const getClientMountState = () => true;
const getServerMountState = () => false;

const getColorStyles = (score: number) => {
  if (score >= 9) return {
    border: "border-purple-500/50",
    bg: "bg-purple-950/30",
    text: "text-purple-300",
    icon: "text-purple-300",
  };
  if (score >= 7) return {
    border: "border-blue-500/50",
    bg: "bg-blue-950/30",
    text: "text-blue-400",
    icon: "text-blue-400",
  };
  if (score >= 5) return {
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/30",
    text: "text-emerald-400",
    icon: "text-emerald-400",
  };
  if (score >= 3) return {
    border: "border-yellow-500/50",
    bg: "bg-yellow-950/30",
    text: "text-yellow-400",
    icon: "text-yellow-400",
  };
  return {
    border: "border-red-500/50",
    bg: "bg-red-950/30",
    text: "text-red-400",
    icon: "text-red-400",
  };
};

interface InteractiveTickProps {
  payload?: { value?: string };
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  notesData: Record<string, number>;
  setActiveTooltip: Dispatch<SetStateAction<ActiveTooltip | null>>;
}

const InteractiveTick = ({ payload, x, y, cx, cy, notesData, setActiveTooltip }: InteractiveTickProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const tickX = x ?? 0;
  const tickY = y ?? 0;
  const centerX = cx ?? 0;
  const centerY = cy ?? 0;
  const metric = buildMetrics.find((item) => item.label === payload?.value) ?? buildMetrics[0];
  const score = notesData[metric.key] ?? 0;
  const styles = getColorStyles(score);
  const Icon = metric.icon;
  const isTop = tickY < centerY - 10;
  const isBottom = tickY > centerY + 10;
  const yOffsetIcon = isTop ? -10 : isBottom ? 10 : 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setActiveTooltip({ name: metric.label, score, x: tickX, y: tickY + yOffsetIcon, cx: centerX, cy: centerY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveTooltip(null);
  };

  return (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="cursor-help" style={{ outline: "none" }}>
      <circle cx={tickX} cy={tickY + yOffsetIcon} r={22} fill="transparent" />
      <foreignObject x={tickX - 12} y={tickY + yOffsetIcon - 12} width={24} height={24}>
        <div className={`flex items-center justify-center transition-colors duration-300 ${isHovered ? styles.icon : "text-zinc-400 hover:text-white"}`}>
          <Icon size={18} />
        </div>
      </foreignObject>
    </g>
  );
};

export default function RadarChartCardBuild({ build, currency = "USD", onSwitchView }: RadarChartCardBuildProps) {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const isMounted = useSyncExternalStore(subscribeToMount, getClientMountState, getServerMountState);

  const notes = getBuildNotes(build, currency);
  const notesData = buildMetrics.reduce<Record<string, number>>((result, metric) => {
    result[metric.key] = notes[metric.key] ?? 0;
    return result;
  }, {});
  const chartData = buildMetrics.map((metric) => ({
    subject: metric.label,
    A: notesData[metric.key],
    fullMark: 10,
  }));
  const activeStyles = activeTooltip ? getColorStyles(activeTooltip.score) : null;

  const getTooltipTransform = (x: number, y: number, cx: number, cy: number) => {
    let translateX = "-50%";
    let translateY = "-50%";
    if (y < cy - 20) translateY = "calc(-100% - 15px)";
    else if (y > cy + 20) translateY = "15px";
    if (x < cx - 20) translateX = "calc(-100% - 15px)";
    else if (x > cx + 20) translateX = "15px";
    return `translate(${translateX}, ${translateY})`;
  };

  return (
    <div className="relative z-40 flex min-h-[320px] flex-col justify-between overflow-visible rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-sm lg:h-full lg:p-8">
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="relative mb-2 w-full">
        <h3 className="pr-28 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
          Balance de la build
        </h3>

        <div className="absolute right-0 top-0 flex items-center gap-3">
          {onSwitchView && (
            <button
              type="button"
              onClick={onSwitchView}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-400 transition-all hover:text-white active:scale-95"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Ver Notas
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
              aria-label="Información sobre el mapa de rendimiento de la build"
              className="relative z-10 flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-1.5 font-bold uppercase tracking-widest text-[12px] text-white">Mapa de rendimiento</div>
              <p>Muestra el equilibrio de la build en sus principales áreas. Pasa el cursor sobre los iconos para ver las notas exactas.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[260px] flex-1 w-full items-center justify-center" onMouseDown={(event) => event.preventDefault()}>
        {activeTooltip && activeStyles && (
          <div
            className="pointer-events-none absolute z-40 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: activeTooltip.x,
              top: activeTooltip.y,
              transform: getTooltipTransform(activeTooltip.x, activeTooltip.y, activeTooltip.cx, activeTooltip.cy),
            }}
          >
            <div className={`flex min-w-[120px] max-w-[160px] flex-col items-center justify-center rounded-xl border px-3.5 py-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-md ${activeStyles.border} ${activeStyles.bg}`}>
              <span className="mb-0.5 max-w-full break-words text-center text-[8px] font-black uppercase leading-tight tracking-widest text-zinc-400">
                {activeTooltip.name}
              </span>
              <span className={`text-2xl font-black tracking-tighter ${activeStyles.text}`}>
                {activeTooltip.score.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="subject" tick={<InteractiveTick notesData={notesData} setActiveTooltip={setActiveTooltip} />} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Build Performance" dataKey="A" stroke="#fff" strokeWidth={2} fill="#fff" fillOpacity={0.15} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex min-h-[260px] h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-800">
            Cargando Balance...
          </div>
        )}
      </div>
    </div>
  );
}
