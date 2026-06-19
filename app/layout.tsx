import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

// Те же шрифты, что на лендинге asvproduction.ru — для единого стиля.
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ASV Production — генератор аудио-превью",
  description:
    "Выбери жанр, настроение и темп — нейросеть создаст короткий аудио-хук для твоего трека.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${montserrat.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
