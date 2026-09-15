"use client";

import React, { useState } from 'react';
import RadarChartCardCombo from './RadarChartCardCombo';
import ComboNotesCard from './ComboNotesCard';

interface ComboEvaluationSectionProps {
  combo: any;
  currency: string;
}

export default function ComboEvaluationSection({ combo, currency }: ComboEvaluationSectionProps) {
  const [mobileView, setMobileView] = useState<'notes' | 'radar'>('notes');

  const toggleView = () => {
    setMobileView((prev) => (prev === 'notes' ? 'radar' : 'notes'));
  };

  return (
    <>
      {/* 💻 VISTA ESCRITORIO: Notas arriba y radar junto a las métricas */}
      <div className="hidden lg:col-span-12 lg:row-start-1 lg:block">
        <ComboNotesCard combo={combo} currency={currency} />
      </div>

      <div className="hidden lg:col-span-6 lg:col-start-7 lg:row-start-2 lg:block">
        <RadarChartCardCombo combo={combo} currency={currency} />
      </div>

      {/* 📱 VISTA MÓVIL: Se muestra solo una tarjeta a la vez con el botón de intercambio */}
      <div className="block lg:hidden col-span-1">
        {mobileView === 'notes' ? (
          <ComboNotesCard 
            combo={combo} 
            currency={currency} 
            onSwitchView={toggleView} 
          />
        ) : (
          <RadarChartCardCombo 
            combo={combo} 
            currency={currency} 
            onSwitchView={toggleView} 
          />
        )}
      </div>
    </>
  );
}
