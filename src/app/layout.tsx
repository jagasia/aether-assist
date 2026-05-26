import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether Assist",
  description: "Premium private AI chat assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
