import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes"; // இதையும் ஆட் பண்ணுங்க

export const metadata: Metadata = {
  title: "Aether Assist",
  description: "Premium private AI chat assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning-ஐ ஆட் பண்ணணும், ஏன்னா themes-க்கு இது அவசியம்
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}