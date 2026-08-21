"use client";

import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Info, Zap, Gamepad2, Leaf, CircleDollarSign, Layers, Gauge
} from 'lucide-react';
import { getComboNotes } from '@/lib/scoringCombos';

interface RadarChartCardComboProps {
  combo?: any;
  currency?: string;
  onSwitchView?: () => void;
}

const getIconForCategory = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('potencia')) return <Zap size={18} />;
  if (cat.includes('productividad')) return <Layers size={18} />;
  if (cat.includes('gaming') || cat.includes('juego')) return <Gamepad2 size={18} />;
  if (cat.includes('eficiencia')) return <Leaf size={18} />;
  if (cat.includes('cuello') || cat.includes('botella')) return <Gauge size={18} />;
  if (cat.includes('precio') || cat.includes('calidad')) return <CircleDollarSign size={18} />;
  return <Zap size={18} />; 
};

const getColorStyles = (score: number) => {
  if (score >= 9) return {
    border: 'border-blue-500/50',
    bg: 'bg-blue-950/95',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  };
  if (score >= 7) return {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/95',
    text: 'text-emerald-400',
    icon: 'text-emerald-400'
  };
  if (score >= 3) return {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-950/95',
    text: 'text-yellow-400',
    icon: 'text-yellow-400'
  };
  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/95',
    text: 'text-red-400',
    icon: 'text-red-400'
  };
};

const InteractiveTick = (props: any) => {
  const { payload, x, y, cx, cy, notesData, setActiveTooltip } = props;
  const [isHovered, setIsHovered] = useState(false);

  const Icon = getIconForCategory(payload.value);
  const score = notesData[payload.value] || 0;
  const styles = getColorStyles(score);

  const isTop = y < cy - 10;
  const isBottom = y > cy + 10;
  const yOffsetIcon = isTop ? -10 : isBottom ? 10 : 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setActiveTooltip({ name: payload.value, score, x, y: y + yOffsetIcon, cx, cy });
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
      <circle cx={x} cy={y + yOffsetIcon} r={22} fill="transparent" />

      <foreignObject x={x - 12} y={y + yOffsetIcon - 12} width={24} height={24}>
        <div className={`flex items-center justify-center transition-colors duration-300 ${isHovered ? styles.icon : 'text-zinc-400 hover:text-white'}`}>
          {Icon}
        </div>
      </foreignObject>
    </g>
  );
};

export default function RadarChartCardCombo({ combo, currency = 'USD', onSwitchView }: RadarChartCardComboProps) {
  const [activeTooltip, setActiveTooltip] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const notes = getComboNotes(combo, currency);

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
    if (y < cy - 20) translateY = "calc(-100% - 15px)";
    else if (y > cy + 20) translateY = "15px";
    if (x < cx - 20) translateX = "calc(-100% - 15px)";
    else if (x > cx + 20) translateX = "15px";
    return `translate(${translateX}, ${translateY})`;
  };

  const activeStyles = activeTooltip ? getColorStyles(activeTooltip.score) : null;

  return (
    <div className="relative z-20 flex flex-col justify-between rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-sm h-full min-h-[250px] lg:pb-0">
      
      {/* Resplandor de fondo */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      {/* HEADER */}
      <div className="relative mb-2 w-full">
        <h3 className="pr-28 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
          Balance
        </h3>

        <div className="absolute right-0 top-0 flex items-center gap-3">
          {onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Ver Notas
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
              aria-label="Información sobre el mapa de rendimiento"
              className="relative z-[10000] flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-[10000] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-1.5 font-bold text-white uppercase tracking-widest text-[12px]">Mapa de Rendimiento</div>
              <p>Muestra la proporción de rendimiento del combo. Pasa el cursor sobre los iconos para ver las notas exactas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL GRÁFICO */}
      <div className="flex-1 w-full relative min-h-[220px] flex items-center justify-center">
        
        {activeTooltip && activeStyles && (
          <div 
            className="absolute z-[10000] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
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
                tick={<InteractiveTick notesData={notesData} setActiveTooltip={setActiveTooltip} />} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name="Combo Performance"
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
          <div className="w-full h-full min-h-[260px] flex items-center justify-center text-zinc-800 text-[10px] font-black uppercase tracking-widest">
            Cargando Balance...
          </div>
        )}
      </div>

    </div>
  );
}
