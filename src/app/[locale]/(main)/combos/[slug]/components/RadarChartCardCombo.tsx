"use client";

import React, { useEffect, useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import {
  BadgeDollarSign, BriefcaseBusiness, Gamepad2, Gauge, Info, Leaf, Zap,
} from 'lucide-react';
import { getComboNotes } from '@/lib/scoringCombos';
import { getCatalogScoreLabelKey } from '@/lib/catalog/presentation';
import { useTranslations } from 'next-intl';

interface RadarChartCardComboProps {
  combo?: object;
  currency?: string;
  onSwitchView?: () => void;
}

interface ActiveTooltip {
  name: string;
  score: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
}

interface InteractiveTickProps {
  payload?: { value?: string };
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  notesData: Record<string, number>;
  setActiveTooltip: (tooltip: ActiveTooltip | null) => void;
  translateCategory: (category: string) => string;
}

const getIconForCategory = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('potencia')) return <Zap size={18} />;
  if (cat.includes('productividad')) return <BriefcaseBusiness size={18} />;
  if (cat.includes('gaming') || cat.includes('juego')) return <Gamepad2 size={18} />;
  if (cat.includes('eficiencia')) return <Leaf size={18} />;
  if (cat.includes('cuello') || cat.includes('botella')) return <Gauge size={18} />;
  if (cat.includes('precio') || cat.includes('calidad')) return <BadgeDollarSign size={18} />;
  return <Gauge size={18} />;
};

const getColorStyles = (score: number) => {
  if (score >= 9) return {
    border: 'border-purple-500/50',
    bg: 'bg-purple-950/30',
    text: 'text-purple-300',
    icon: 'text-purple-300'
  };
  if (score >= 7) return {
    border: 'border-blue-500/50',
    bg: 'bg-blue-950/30',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  };
  if (score >= 5) return {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-400',
    icon: 'text-emerald-400'
  };
  if (score >= 3) return {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-950/30',
    text: 'text-yellow-400',
    icon: 'text-yellow-400'
  };
  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    text: 'text-red-400',
    icon: 'text-red-400'
  };
};

const InteractiveTick = (props: InteractiveTickProps) => {
  const { payload, x, y, cx, cy, notesData, setActiveTooltip, translateCategory } = props;
  const [isHovered, setIsHovered] = useState(false);

  const category = payload?.value ?? '';
  const xPosition = x ?? 0;
  const yPosition = y ?? 0;
  const centerX = cx ?? 0;
  const centerY = cy ?? 0;
  const Icon = getIconForCategory(category);
  const score = notesData[category] || 0;
  const label = translateCategory(category);
  const styles = getColorStyles(score);

  const isTop = yPosition < centerY - 10;
  const isBottom = yPosition > centerY + 10;
  const yOffsetIcon = isTop ? -10 : isBottom ? 10 : 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setActiveTooltip({
      name: label,
      score,
      x: xPosition,
      y: yPosition + yOffsetIcon,
      cx: centerX,
      cy: centerY,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveTooltip(null);
  };

  return (
    <g 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      className="cursor-help"
      style={{ outline: 'none' }}
    >
      <circle cx={xPosition} cy={yPosition + yOffsetIcon} r={22} fill="transparent" />

      <foreignObject x={xPosition - 12} y={yPosition + yOffsetIcon - 12} width={24} height={24}>
        <div className={`flex items-center justify-center transition-colors duration-300 ${isHovered ? styles.icon : 'text-zinc-400 hover:text-white'}`}>
          {Icon}
        </div>
      </foreignObject>
    </g>
  );
};

export default function RadarChartCardCombo({ combo, currency = 'USD', onSwitchView }: RadarChartCardComboProps) {
  const t = useTranslations('combos');
  const tCatalog = useTranslations('catalog');
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const notes = getComboNotes((combo ?? {}) as Record<string, unknown>, currency);

  const notesData: Record<string, number> = {
    'Potencia': notes.Potencia,
    'Productividad': notes.Productividad,
    'Gaming': notes.Gaming,
    'Eficiencia': notes.Eficiencia,
    'Cuello Botella': notes["Cuello Botella"],
    'Calidad Precio': notes["Calidad Precio"],
  };

  const chartData = Object.entries(notesData).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 10,
  }));

  const getTooltipTransform = (x: number, y: number, cx: number, cy: number) => {
    let translateX = "-50%";
    let translateY = "-50%";
    // Keep the tooltip inside the chart/card: labels point inward.
    if (y < cy - 20) translateY = "calc(-100% - 15px)";
    else if (y > cy + 20) translateY = "15px";
    if (x < cx - 20) translateX = "calc(-100% - 15px)";
    else if (x > cx + 20) translateX = "15px";
    return `translate(${translateX}, ${translateY})`;
  };

  const activeStyles = activeTooltip ? getColorStyles(activeTooltip.score) : null;

  return (
    <div className="relative z-40 flex flex-col justify-between overflow-visible rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-sm h-full min-h-[250px] lg:pb-0">
      
      {/* Resplandor de fondo */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      {/* HEADER */}
      <div className="relative mb-2 w-full">
        <h3 className="pr-28 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
          {t('radar')}
        </h3>

        <div className="absolute right-0 top-0 flex items-center gap-3">
          {onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t('viewNotes')}
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
              aria-label={t('radarInfoLabel')}
              className="relative z-10 flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-1.5 font-bold text-white uppercase tracking-widest text-[12px]">{t('radarTitle')}</div>
              <p>{t('radarDescription')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL GRÁFICO */}
      <div
        className="flex-1 w-full relative min-h-[220px] flex items-center justify-center"
        onMouseDown={(event) => event.preventDefault()}
      >
        
        {activeTooltip && activeStyles && (
          <div 
            className="absolute z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: activeTooltip.x,
              top: activeTooltip.y,
              transform: getTooltipTransform(activeTooltip.x, activeTooltip.y, activeTooltip.cx, activeTooltip.cy)
            }}
          >
            <div className={`flex max-w-[160px] flex-col items-center justify-center rounded-xl border px-3.5 py-2 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[120px] ${activeStyles.border} ${activeStyles.bg}`}>
              <span className="max-w-full whitespace-normal break-words text-center text-[8px] font-black uppercase tracking-widest leading-tight mb-0.5 text-zinc-400">
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
            <RadarChart
              cx="50%"
              cy="50%" 
              outerRadius="75%" 
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }} 
            >
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={<InteractiveTick
                  notesData={notesData}
                  setActiveTooltip={setActiveTooltip}
                  translateCategory={(category: string) => tCatalog(getCatalogScoreLabelKey(category))}
                />}
              />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name={t('radar')}
                dataKey="A"
                stroke="#fff"
                strokeWidth={2}
                fill="#fff"
                fillOpacity={0.15}
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full min-h-[260px] w-full items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-800">
            {t('loadingBalance')}
          </div>
        )}
      </div>

    </div>
  );
}
