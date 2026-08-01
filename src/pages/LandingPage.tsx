import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import {
  Scale, ShieldCheck, MessageSquare, Video, Bot, Wallet, Star,
  Search, CalendarCheck, FileText, ArrowRight, Users, Award,
} from 'lucide-react';

const featureIcons = [ShieldCheck, MessageSquare, Bot, Wallet, FileText, Star];
const stepIcons = [Search, CalendarCheck, Bot];

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/30">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.08),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur">
              <Scale className="h-4 w-4" />
              {t('common.tagline')}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {t('landing.heroTitle')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/lawyers"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                {t('landing.heroCta')} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/ai-assistant"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Bot className="h-5 w-5 text-emerald-600" /> {t('landing.heroSecondary')}
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t('landing.statsLawyers'), value: '500+' },
              { label: t('landing.statsClients'), value: '10K+' },
              { label: t('landing.statsConsultations'), value: '25K+' },
              { label: t('landing.statsSatisfaction'), value: '98%' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-center shadow-sm backdrop-blur">
                <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t('landing.featuresTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('landing.featuresSubtitle')}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
              { title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
              { title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
              { title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
              { title: t('landing.feature5Title'), desc: t('landing.feature5Desc') },
              { title: t('landing.feature6Title'), desc: t('landing.feature6Desc') },
            ].map((feature, i) => {
              const Icon = featureIcons[i] ?? ShieldCheck;
              return (
                <div
                  key={i}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t('landing.howItWorksTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('landing.howItWorksSubtitle')}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { title: t('landing.step1Title'), desc: t('landing.step1Desc') },
              { title: t('landing.step2Title'), desc: t('landing.step2Desc') },
              { title: t('landing.step3Title'), desc: t('landing.step3Desc') },
            ].map((step, i) => {
              const Icon = stepIcons[i] ?? Search;
              return (
                <div key={i} className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="absolute left-1/2 top-8 -z-10 -translate-x-1/2 text-6xl font-bold text-emerald-100">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Practice Areas */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t('landing.practiceAreasTitle')}</h2>
            <p className="mt-4 text-lg text-slate-600">{t('landing.practiceAreasSubtitle')}</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { en: 'Family Law', bn: 'পারিবারিক আইন', icon: Users },
              { en: 'Criminal Law', bn: 'ফৌজদারি আইন', icon: Scale },
              { en: 'Corporate Law', bn: 'কর্পোরেট আইন', icon: Award },
              { en: 'Property Law', bn: 'সম্পত্তি আইন', icon: FileText },
              { en: 'Cyber Law', bn: 'সাইবার আইন', icon: ShieldCheck },
            ].map((area, i) => {
              const Icon = area.icon;
              return (
                <Link
                  key={i}
                  to="/lawyers"
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {i18n.language === 'bn' ? area.bn : area.en}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('landing.ctaTitle')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">{t('landing.ctaSubtitle')}</p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
          >
            {t('landing.ctaButton')} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
