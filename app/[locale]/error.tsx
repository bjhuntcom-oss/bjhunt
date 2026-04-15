"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Home, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header BJHUNT */}
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center">
          {/* 500 Number with gradient */}
          <div className="relative mb-8">
            <div 
              className="text-[140px] md:text-[180px] font-black leading-none tracking-tighter"
              style={{
                background: 'linear-gradient(180deg, #ef4444 0%, #7f1d1d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              500
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-red-400">
            {t("serverError.title")}
          </h1>
          <p className="text-white/50 text-base md:text-lg mb-10 leading-relaxed">
            {t("serverError.description")}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {t("serverError.tryAgain")}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
            >
              <Home className="w-5 h-5" />
              {t("serverError.backHome")}
            </Link>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-center gap-4 text-sm mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white/40">{t("serverError.status.api")}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-white/40">{t("serverError.status.app")}</span>
            </div>
          </div>

          {/* Support link */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-sm text-white/40">
              {t("serverError.support")}{" "}
              <a 
                href="mailto:support@bjhunt.com" 
                className="text-white/60 hover:text-white underline transition-colors"
              >
                support@bjhunt.com
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer BJHUNT */}
      <Footer />
    </div>
  );
}
