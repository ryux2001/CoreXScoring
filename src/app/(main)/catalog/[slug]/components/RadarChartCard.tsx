"use client";

import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import {
  BadgeDollarSign, Blocks, BriefcaseBusiness, CircuitBoard, Code2, Gauge,
  Gamepad2, Info, Leaf, MemoryStick, Network, PlugZap, ScanLine, ShieldCheck,
  ThermometerSnowflake, Timer, Wrench, Zap,
} from 'lucide-react';
import { getComponentNotes } from '@/lib/scoring/index';
import { convertPrice } from '@/lib/currency';
import {
  type GpuValueProfile,
} from '@/lib/scoring/components/calculations/gpu/profiles';
import {
  type CpuValueProfile,
} from '@/lib/scoring/components/calculations/cpu/profiles';
import { useCatalogPriceEvaluationStore } from '@/store/useCatalogPriceEvaluationStore';
import { getProductPrice } from '@/lib/catalog/product-price';

type ValueProfile = GpuValueProfile | CpuValueProfile;

interface RadarChartProps {
  product: any;
  currency?: string;
  onSwitchView?: () => void;     // NUEVO PROP OPCIONAL
  currentMobileView?: 'radar';   // NUEVO PROP OPCIONAL
}

// Cada métrica se expresa con un símbolo propio; los aliases mantienen la
// compatibilidad con los nombres que devuelven los distintos perfiles.
const getIconForCategory = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('potencia')) return <Zap size={20} />;
  if (cat.includes('raster') || cat.includes('rendimiento') || cat.includes('velocidad')) return <Gauge size={20} />;
  if (cat.includes('ray tracing')) return <ScanLine size={20} />;
  if (cat.includes('juego') || cat.includes('gaming')) return <Gamepad2 size={20} />;
  if (cat.includes('eficiencia')) return <Leaf size={20} />;
  if (cat.includes('precio') || cat.includes('calidad')) return <BadgeDollarSign size={20} />;
  if (cat.includes('tecnología')) return <CircuitBoard size={20} />;
  if (cat.includes('temperatura')) return <ThermometerSnowflake size={20} />;
  if (cat.includes('durabilidad') || cat.includes('proteccion')) return <ShieldCheck size={20} />;
  if (cat.includes('estabilidad')) return <Gauge size={20} />;
  if (cat.includes('latencia')) return <Timer size={20} />;
  if (cat.includes('productividad')) return <BriefcaseBusiness size={20} />;
  if (cat.includes('memoria')) return <MemoryStick size={20} />;
  if (cat.includes('software')) return <Code2 size={20} />;
  if (cat.includes('conectividad')) return <Network size={20} />;
  if (cat.includes('compatibilidad')) return <PlugZap size={20} />;
  if (cat.includes('expansión')) return <Blocks size={20} />;
  if (cat.includes('construcción')) return <Wrench size={20} />;
  return <Gauge size={20} />;
};

// 2. FUNCIÓN DE COLORES DINÁMICOS
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

// 3. COMPONENTE DE TICK INTERACTIVO
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
      <circle cx={x} cy={y + yOffsetIcon} r={24} fill="transparent" />

      <foreignObject x={x - 14} y={y + yOffsetIcon - 14} width={28} height={28}>
        <div className={`flex items-center justify-center transition-colors duration-300 ${isHovered ? styles.icon : 'text-white'}`}>
          {Icon}
        </div>
      </foreignObject>
    </g>
  );
};

export default function RadarChartCard({ product, currency = 'USD', onSwitchView }: RadarChartProps) {
  const isEUR = currency === 'EUR';
  const isGpu = String(product?.type ?? '').toUpperCase() === 'GPU';
  const isCpu = String(product?.type ?? '').toUpperCase() === 'CPU';
  const initialPrice = getProductPrice(product, currency);

  const evaluation = useCatalogPriceEvaluationStore((state) => state.current);
  const isCurrentEvaluation = evaluation?.productId === String(product?.id ?? '') && evaluation.currency === (isEUR ? 'EUR' : 'USD');
  const evaluatedPrice = isCurrentEvaluation ? evaluation.price : initialPrice;
  const [activeTooltip, setActiveTooltip] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const valueProfile: ValueProfile = isCurrentEvaluation && evaluation?.valueProfile
    ? evaluation.valueProfile as ValueProfile
    : 'balanced';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const evaluatedPriceUSD = convertPrice(evaluatedPrice, currency, 'USD');
  const notesData = getComponentNotes(
    product,
    evaluatedPriceUSD,
    isGpu || isCpu ? valueProfile : undefined,
  );
  
  const chartData = Object.entries(notesData).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 10,
  }));

  const getTooltipTransform = (x: number, y: number, cx: number, cy: number) => {
    let translateX = "-50%";
    let translateY = "-50%";
    // Keep the tooltip inside the chart/card: labels point inward.
    if (y < cy - 20) translateY = "calc(-100% - 20px)";
    else if (y > cy + 20) translateY = "20px";
    if (x < cx - 20) translateX = "calc(-100% - 20px)";
    else if (x > cx + 20) translateX = "20px";
    return `translate(${translateX}, ${translateY})`;
  };

  const activeStyles = activeTooltip ? getColorStyles(activeTooltip.score) : null;

  return (
    <div className="relative z-40 flex flex-col overflow-visible rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl h-full min-h-[400px] lg:p-8">
      
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      {/* HEADER MODIFICADO */}
      <div className="relative mb-4 w-full">
        <h3 className="pr-28 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
          Balance
        </h3>
        
        {/* GRUPO DE ACCIONES DEL HEADER (INFO + TOGGLE MÓVIL) */}
        <div className="absolute right-0 top-0 flex items-center gap-3">
          {/* Botón de intercambio: Solo se renderiza si se pasa el prop onSwitchView */}
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
              className="relative z-10 flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
          <div className="invisible absolute right-0 top-9 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-2 font-bold text-white uppercase tracking-widest text-[12px]">Mapa de Rendimiento</div>
              <p>El gráfico ilustra el equilibrio en distintas áreas. Pasa el cursor por los iconos para ver los detalles.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL GRÁFICO: Se eliminó el z-10 para que los tooltips calculen su z-index contra el componente entero */}
      <div
        className="flex-1 w-full relative min-h-[300px]"
        onMouseDown={(event) => event.preventDefault()}
      >
        
        {/* MINIVENTANITA DE LOS ICONOS */}
        {activeTooltip && activeStyles && (
          <div 
            className="absolute z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: activeTooltip.x,
              top: activeTooltip.y,
              transform: getTooltipTransform(activeTooltip.x, activeTooltip.y, activeTooltip.cx, activeTooltip.cy)
            }}
          >
            <div className={`flex max-w-[180px] flex-col items-center justify-center rounded-xl border px-4 py-2.5 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.6)] min-w-[130px] ${activeStyles.border} ${activeStyles.bg}`}>
              <span className="max-w-full whitespace-normal break-words text-center text-[9px] font-black uppercase tracking-widest leading-tight mb-0.5 text-zinc-400">
                {activeTooltip.name}
              </span>
              <span className={`text-[28px] font-black tracking-tighter ${activeStyles.text}`}>
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
              outerRadius="85%" 
              data={chartData}
              margin={{ top: 25, right: 25, bottom: 25, left: 25 }} 
            >
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={<InteractiveTick notesData={notesData} setActiveTooltip={setActiveTooltip} />} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name={product.name}
                dataKey="A"
                stroke="#ffffff"
                strokeWidth={2}
                fill="#ffffff"
                fillOpacity={0.10}
                dot={{ r: 4, fill: "#ffffff", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-800 text-[10px] font-black uppercase tracking-widest">
            Cargando Gráfico...
          </div>
        )}
      </div>
    </div>
  );
}
