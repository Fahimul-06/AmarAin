import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, FileText } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  const { t } = useTranslation();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-emerald-50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          </div>
          <p className="mt-3 max-w-2xl text-emerald-50">{intro}</p>
          <p className="mt-2 text-xs text-emerald-100">
            {t('legal.lastUpdated', { date: new Date().toLocaleDateString() })}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('legal.tableOfContents')}</p>
              <ul className="mt-3 space-y-1.5">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700"
          aria-label={t('legal.backToTop')}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">{question}</span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition ${open ? 'rotate-180' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-600">{answer}</p>
        </div>
      )}
    </div>
  );
}
