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
      <div className="min-w-0 flex-1 md:pr-80 lg:pr-[22.5rem]">{children}</div>
      <div className="md:pr-80 lg:pr-[22.5rem]">
        <Footer />
      </div>
      <AISidebar />
    </div>
  );
}
