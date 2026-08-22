import Navbar from "@/ui/navbar/Navbar";
import AISidebar from "@/ui/ai/AISidebar";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="min-w-0 flex-1 bg-black md:pr-80 lg:pr-[22.5rem]">
        Home
      </main>
      <AISidebar />
    </div>
  );
}
