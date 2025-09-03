"use client";

import Image from "next/image";
import Link from "next/link";

const WhatsAppIcon = () => {
  return (
    <Link
      href="https://wa.me/6282249013283"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors duration-300"
      aria-label="Chat on WhatsApp"
    >
      <Image src="/whatsapp.svg" alt="WhatsApp Icon" width={32} height={32} />
    </Link>
  );
};

export default WhatsAppIcon;
