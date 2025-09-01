import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { Footer } from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "트립조이",
  description: "여행 이상의 연결, 트립조이",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          async
        />
      </head>
      <body className={inter.className}>
        <TranslationProvider>
          <AuthProvider>
            {children}
            <Footer />
          </AuthProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
