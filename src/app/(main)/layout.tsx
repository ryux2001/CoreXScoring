 import React from 'react'
 import Navbar from '@/ui/navbar/Navbar';
 
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
     <Navbar></Navbar>
      {children}
    </>
  );
}