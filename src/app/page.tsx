import Image from "next/image";
import Navbar from "@/ui/navbar/Navbar";

export default function HomePage() {
  return (
    <>
     <Navbar></Navbar>
      <div className="h-dvh block bg-black">
        Home
      </div>
    </>
  );
}
