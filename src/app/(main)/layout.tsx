import React from "react";
import Footer from "@/ui/footer/Footer";
import Navbar from "@/ui/navbar/Navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="min-w-0 flex-1">{children}</div>
      <Footer />
    </div>
  );
}
