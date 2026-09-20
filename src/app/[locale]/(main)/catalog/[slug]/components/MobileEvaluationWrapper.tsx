"use client";

import React, { useState } from 'react';
import NotesCard from './NotesCard';
import RadarChartCard from './RadarChartCard';

interface MobileWrapperProps {
  product: any;
  currency: string;
}

export default function MobileEvaluationWrapper({ product, currency }: MobileWrapperProps) {
  const [activeView, setActiveView] = useState<'numeric' | 'radar'>('numeric');

  return (
    <div className="w-full h-[400px] relative animate-in fade-in duration-300">
      {activeView === 'numeric' ? (
        <NotesCard 
          product={product} 
          currency={currency} 
          onSwitchView={() => setActiveView('radar')}
          currentMobileView="numeric"
        />
      ) : (
        <RadarChartCard 
          product={product} 
          currency={currency} 
          onSwitchView={() => setActiveView('numeric')}
          currentMobileView="radar"
        />
      )}
    </div>
  );
}
