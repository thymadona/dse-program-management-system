import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { cn } from "@dse-pms/ui";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "DSE-PMS",
  description: "DSE Program Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", inter.variable, geistHeading.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
