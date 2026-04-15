"use client";

import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { SignalWaveSVG } from "@/components/animations/signal-wave";
import { useTranslations } from "next-intl";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/section-label";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setError(t("captchaError"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, captchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("genericError"));
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t("connectionError"));
    }

    setLoading(false);
    setCaptchaToken("");
    captchaRef.current?.resetCaptcha();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (submitted) {
    return (
      <div className="pt-14 min-h-screen">
        <div className="max-w-lg mx-auto px-8 py-20 text-center">
          <div className="w-16 h-16 border-2 border-[var(--border)] mx-auto mb-6 flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black tracking-tight mb-2">{t("messageSent")}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {t("confirmationMsg")} {formData.email} {t("within48h")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen">
      {/* Hero with animation */}
      <div className="border-b border-[var(--border)] grid lg:grid-cols-2">
        <div className="px-8 md:px-12 py-16">
          <SectionLabel>Contact</SectionLabel>
          <h1 className="text-4xl font-black mt-4 mb-2 tracking-tight">Parlons-nous.</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Une question, un partenariat, ou un besoin spécifique — répondons sous 24h.
          </p>
        </div>
        <div className="hidden lg:flex items-center justify-center border-l border-[var(--border)] p-12">
          <SignalWaveSVG className="w-full max-w-xs opacity-70" />
        </div>
      </div>
      {/* Form */}
      <div className="max-w-lg mx-auto px-8 py-16">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">{t("fullName")} *</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">{t("professionalEmail")} *</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">{t("company")}</label>
            <Input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder={t("companyPlaceholder")}
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">{t("subject")} *</label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
              required
            >
              <option value="">{t("selectSubject")}</option>
              <option value="demo">{t("subjectDemo")}</option>
              <option value="pricing">{t("subjectPricing")}</option>
              <option value="technical">{t("subjectTechnical")}</option>
              <option value="partnership">{t("subjectPartnership")}</option>
              <option value="other">{t("subjectOther")}</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">{t("message")} *</label>
            <Textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              placeholder={t("messagePlaceholder")}
              required
            />
          </div>

          <div className="pt-1">
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ""}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              ref={captchaRef}
              theme="dark"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le message"}
          </Button>
        </form>
      </div>
    </div>
  );
}
