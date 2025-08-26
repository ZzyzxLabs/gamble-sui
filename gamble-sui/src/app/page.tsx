"use client";
import NavBar from "@/component/nav";
import Image from "next/image";
import { useState } from "react";
import Ticket from "@/component/ticket";
import Admin from "@/component/admin";
export default function Home() {
  const [isAdminView, setIsAdminView] = useState(false);
  
  return (
    <>
    <NavBar 
        onAdminClick={() => setIsAdminView(true)} 
        onTicketClick={() => setIsAdminView(false)} 
      />
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      {isAdminView ? (
        <Admin />
      ) : (
        <Ticket />
      )}
    </div>
    </>
  );
}
