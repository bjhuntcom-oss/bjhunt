"use client";

import Link from "next/link";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useState } from "react";
import { Home, ArrowRight, ArrowUpRight } from "lucide-react";
import "./globals.css";

const content = {
  en: {
    code: "404",
    title: "Lost in Cyberspace",
    subtitle: "The page you're looking for has vanished into the digital void.",
    home: "Back to Home",
    contact: "Contact Support",
    suggestion: "Perhaps you were looking for:",
    nav: [
      { label: "Home", key: "01" },
      { label: "Pricing", key: "02" },
      { label: "API", key: "03" },
      { label: "Investors", key: "04" },
      { label: "Contact", key: "05" },
    ],
    footer: {
      contact: "Contact",
      nav: "Nav",
      status: "Status",
      brand: "Brand",
      copyright: "All rights reserved",
      tagline: "The ChatGPT of Cybersecurity.",
      tools: "317+ tools. <5% false positives.",
      launch: "Launch",
      ready: "Ready to secure",
      yourInfra: "your infrastructure?",
      partnerships: "Partnerships",
      legal: "Legal",
      period: "Dec 2023 → Present",
      active: "Active",
    },
  },
  fr: {
    code: "404",
    title: "Perdu dans le Cyberespace",
    subtitle: "La page que vous recherchez s'est volatilisée dans le néant numérique.",
    home: "Retour à l'accueil",
    contact: "Contacter le support",
    suggestion: "Peut-être cherchiez-vous :",
    nav: [
      { label: "Accueil", key: "01" },
      { label: "Tarifs", key: "02" },
      { label: "API", key: "03" },
      { label: "Investisseurs", key: "04" },
      { label: "Contact", key: "05" },
    ],
    footer: {
      contact: "Contact",
      nav: "Nav",
      status: "Statut",
      brand: "Marque",
      copyright: "Tous droits réservés",
      tagline: "Le ChatGPT de la Cybersécurité.",
      tools: "317+ outils. <5% faux positifs.",
      launch: "Lancement",
      ready: "Prêt à sécuriser",
      yourInfra: "votre infrastructure ?",
      partnerships: "Partenariats",
      legal: "Mentions légales",
      period: "Déc 2023 → Présent",
      active: "Actif",
    },
  }
};

function getInitialLocale(): "en" | "fr" {
  if (typeof window !== "undefined") {
    return window.location.pathname.startsWith("/fr") ? "fr" : "en";
  }
  return "en";
}

export default function GlobalNotFound() {
  const [locale] = useState<"en" | "fr">(getInitialLocale);

  const t = content[locale];
  const homePath = locale === "fr" ? "/fr" : "/en";
  const paths = ["", "/pricing", "/api-docs", "/investors", "/contact"];

  const navLinks = t.nav.map((item, i) => ({
    href: `${homePath}${paths[i]}`,
    label: item.label,
    num: item.key,
  }));
  
  const quickLinks = [
    { label: t.nav[0].label, href: homePath },
    { label: t.nav[1].label, href: `${homePath}/pricing` },
    { label: "API Docs", href: `${homePath}/api-docs` },
    { label: t.nav[4].label, href: `${homePath}/contact` },
  ];

  return (
    <html lang={locale}>
      <body style={{ backgroundColor: '#000', color: '#fff', margin: 0 }}>
        <div className="min-h-screen bg-black text-white flex flex-col">
          {/* Header BJHUNT */}
          <header className="bg-black border-b border-white/20">
            <div className="h-px bg-white/40" />
            <div className="flex items-center h-14">
              {/* Logo */}
              <Link href={homePath} className="flex items-center justify-center h-full px-2 md:px-3 border-r border-white/[0.12] hover:bg-white/[0.04] transition-colors">
                <div className="relative w-[150px] md:w-[180px] h-12 overflow-hidden flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <LogoSymbol size={28} />
                    <LogoWordmark className="text-[15px]" />
                  </div>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center h-full flex-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="h-full px-4 lg:px-5 flex items-center text-[11px] tracking-widest uppercase text-white/60 hover:text-white hover:bg-white/5 border-r border-white/10 transition-colors"
                  >
                    <span className="text-white/30 mr-2 text-[9px]">{link.num}</span>
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile Language Switcher */}
              <div className="md:hidden h-full px-3 flex items-center border-l border-white/10 ml-auto">
                <div className="flex items-center gap-1 text-[10px]">
                  <Link 
                    href="/fr" 
                    className={`px-2 py-1 ${locale === 'fr' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                  >
                    FR
                  </Link>
                  <Link 
                    href="/en" 
                    className={`px-2 py-1 ${locale === 'en' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                  >
                    EN
                  </Link>
                </div>
              </div>

              {/* CTA - Desktop only */}
              <Link
                href={`${homePath}/contact`}
                className="hidden md:flex h-full px-5 items-center gap-2 bg-white text-black text-[10px] font-medium tracking-widest uppercase hover:bg-white/90 transition-colors"
              >
                <span>Contact</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="h-px bg-white/40" />
          </header>

          {/* Main content */}
          <main className="flex-1 flex items-center justify-center px-6 py-16">
            <div className="max-w-lg w-full text-center">
              {/* 404 Number */}
              <div className="relative mb-8">
                <div 
                  className="text-[140px] md:text-[180px] font-black leading-none tracking-tighter"
                  style={{
                    background: 'linear-gradient(180deg, #fff 0%, #666 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {t.code}
                </div>
              </div>

              {/* Message */}
              <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                {t.title}
              </h1>
              <p className="text-white/50 text-base md:text-lg mb-10 leading-relaxed">
                {t.subtitle}
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link
                  href={homePath}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold hover:bg-white/90 transition-all"
                >
                  <Home className="w-5 h-5" />
                  {t.home}
                </Link>
                <Link
                  href={`${homePath}/contact`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  {t.contact}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Quick links */}
              <div className="border-t border-white/10 pt-8">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-4">
                  {t.suggestion}
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* Footer BJHUNT - Exact copy from main footer */}
          <footer className="bg-black">
            {/* Cadre supérieur */}
            <div className="h-px bg-white/40" />
            <div className="flex">
              <div className="w-px h-2 bg-white/40" />
              <div className="flex-1">
                <div className="h-px bg-gradient-to-r from-white/30 via-white/10 to-white/30 mt-1" />
                <div className="grid grid-cols-4 md:grid-cols-8 h-1 mt-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border-r border-white/[0.04] last:border-0" />
                  ))}
                </div>
              </div>
              <div className="w-px h-2 bg-white/40" />
            </div>

            {/* Section principale compacte */}
            <div className="grid lg:grid-cols-12 divide-x divide-white/[0.06]">
              {/* Bloc CTA gauche */}
              <div className="lg:col-span-5 p-6 md:p-8">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-white/30">Contact</span>
                  <span className="text-[9px] text-white/20 font-mono">01</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4 leading-tight">
                  {t.footer.ready}<br/>
                  <span className="text-white/30">{t.footer.yourInfra}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="mailto:contact@bjhunt.com"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-medium tracking-wider uppercase hover:bg-white/90"
                  >
                    <span>contact@bjhunt.com</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                  <a
                    href="mailto:partner@bjhunt.com"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-[10px] font-medium tracking-wider uppercase hover:bg-white/5"
                  >
                    {t.footer.partnerships}
                  </a>
                </div>
              </div>

              {/* Bloc liens central */}
              <div className="lg:col-span-4 grid grid-cols-2 divide-x divide-white/[0.06]">
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-white/30">{t.footer.nav}</span>
                    <span className="text-[9px] text-white/20 font-mono">02</span>
                  </div>
                  <div className="space-y-2">
                    <Link href={homePath} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      {t.nav[0].label}
                    </Link>
                    <Link href={`${homePath}/pricing`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      {t.nav[1].label}
                    </Link>
                    <Link href={`${homePath}/api-docs`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      API
                    </Link>
                    <Link href={`${homePath}/investors`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      {t.nav[3].label}
                    </Link>
                    <Link href={`${homePath}/contact`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      {t.nav[4].label}
                    </Link>
                    <Link href={`${homePath}/legal`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white group">
                      <span className="w-3 h-px bg-white/20 group-hover:w-5 group-hover:bg-white transition-all" />
                      {t.footer.legal}
                    </Link>
                  </div>
                </div>
                
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-white/30">{t.footer.status}</span>
                    <span className="text-[9px] text-white/20 font-mono">03</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/40">Version</span>
                      <span className="text-white/60 font-mono">0.9.0</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/40">Phase</span>
                      <span className="text-white/60">Beta</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/40">{t.footer.launch}</span>
                      <span className="text-white/60">2026</span>
                    </div>
                    {/* Mini barre */}
                    <div className="pt-2">
                      <div className="h-0.5 bg-white/10 w-full">
                        <div className="h-full bg-white/60" style={{ width: '90%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc Logo droit */}
              <div className="lg:col-span-3 p-6 md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-white/30">{t.footer.brand}</span>
                  <span className="text-[9px] text-white/20 font-mono">04</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <LogoSymbol size={28} />
                    <LogoWordmark className="text-[15px]" />
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    {t.footer.tagline}<br/>
                    {t.footer.tools}
                  </p>
                </div>
              </div>
            </div>

            {/* Barre inférieure */}
            <div className="flex items-center justify-between px-4 md:px-6 h-10 text-[9px] text-white/20">
              <div className="flex items-center gap-4">
                <span>© 2026 BJHUNT</span>
                <span className="hidden md:inline">·</span>
                <span className="hidden md:inline">{t.footer.copyright}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline">{t.footer.period}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-white/40" />
                  <span>{t.footer.active}</span>
                </div>
              </div>
            </div>

            {/* Cadre inférieur */}
            <div className="flex">
              <div className="w-px h-2 bg-white/40" />
              <div className="flex-1">
                <div className="grid grid-cols-4 md:grid-cols-8 h-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border-r border-white/[0.04] last:border-0" />
                  ))}
                </div>
                <div className="h-px bg-gradient-to-r from-white/30 via-white/10 to-white/30 mt-1" />
              </div>
              <div className="w-px h-2 bg-white/40" />
            </div>
            <div className="h-px bg-white/40" />
          </footer>
        </div>
      </body>
    </html>
  );
}
