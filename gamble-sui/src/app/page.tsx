"use client";
import NavBar from "@/component/nav";
import Image from "next/image";
import { useState, useEffect } from "react";
import Ticket from "@/component/ticket";
import Admin from "@/component/admin";
export default function Home() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <NavBar
        onAdminClick={() => setIsAdminView(true)}
        onTicketClick={() => setIsAdminView(false)}
      />
      <div className="flex min-h-screen flex-col items-center justify-center">
        {isAdminView ? <Admin /> : <Ticket />}
      </div>
    </>
  );
}
