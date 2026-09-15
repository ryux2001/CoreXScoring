import React from "react";
import Footer from "@/ui/footer/Footer";
import Navbar from "@/ui/navbar/Navbar";
import CurrencyPreferenceSync from "@/ui/currency/CurrencyPreferenceSync";
import AISidebar from "@/ui/ai/AISidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <CurrencyPreferenceSync />
      <Navbar />
      <div className="ai-sidebar-offset min-w-0 flex-1">{children}</div>
      <div className="ai-sidebar-offset">
        <Footer />
      </div>
      <AISidebar />
    </div>
  );
}
