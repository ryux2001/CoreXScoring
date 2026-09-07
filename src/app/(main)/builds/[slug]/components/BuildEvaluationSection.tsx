"use client";

import { useState } from "react";
import type { Build } from "@/lib/scoringBuilds";
import BuildNotesCard from "./BuildNotesCard";
import RadarChartCardBuild from "./RadarChartCardBuild";

interface BuildEvaluationSectionProps {
  build: Build;
  currency: string;
}

export default function BuildEvaluationSection({ build, currency }: BuildEvaluationSectionProps) {
  const [mobileView, setMobileView] = useState<"notes" | "radar">("notes");
  const toggleView = () => setMobileView((previous) => (previous === "notes" ? "radar" : "notes"));

  return (
    <>
      <div className="hidden lg:col-span-12 lg:row-start-1 lg:block">
        <BuildNotesCard build={build} currency={currency} />
      </div>

      <div className="hidden lg:col-span-6 lg:col-start-7 lg:row-start-2 lg:block">
        <RadarChartCardBuild build={build} currency={currency} />
      </div>

      <div className="col-span-1 block lg:hidden">
        {mobileView === "notes" ? (
          <BuildNotesCard build={build} currency={currency} onSwitchView={toggleView} />
        ) : (
          <RadarChartCardBuild build={build} currency={currency} onSwitchView={toggleView} />
        )}
      </div>
    </>
  );
}
