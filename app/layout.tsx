import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const jb = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "OMP Academy · Computación Paralela", template: "%s · OMP Academy" },
  description: "Aprende OpenMP y algoritmos paralelos con lecciones interactivas, retos tipo LeetCode, flashcards y ejercicios resueltos. CS4052 UTEC.",
};
export const viewport: Viewport = { themeColor: "#0d0e12", width: "device-width", initialScale: 1 };

const themeScript = `try{var s=JSON.parse(localStorage.getItem('omp-academy-v1')||'{}');if(s.state&&s.state.theme==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${grotesk.variable} ${jb.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
