import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Causal Tutor",
  description: "AI-powered Causal Inference Tutor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      <body className={`${inter.className} h-full w-full overflow-hidden bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
