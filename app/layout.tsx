'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono-",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <title>Scope - Data Explorer</title>
        <meta name="description" content="Minimalist Elasticsearch explorer" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Suspense fallback={<div className="w-16 border-r bg-card h-screen" />}>
            <Sidebar />
          </Suspense>
          <main className="flex-1 overflow-auto relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}