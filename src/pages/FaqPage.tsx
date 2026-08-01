import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HelpCircle, Mail } from 'lucide-react';
import { FaqItem } from '@/components/LegalPage';

export default function FaqPage() {
  const { t } = useTranslation();

  const sections: { title: string; items: { q: string; a: string }[] }[] = [
    {
      title: t('legal.faq.generalTitle'),
      items: [
        { q: t('legal.faq.generalQ1'), a: t('legal.faq.generalA1') },
        { q: t('legal.faq.generalQ2'), a: t('legal.faq.generalA2') },
        { q: t('legal.faq.generalQ3'), a: t('legal.faq.generalA3') },
      ],
    },
    {
      title: t('legal.faq.bookingTitle'),
      items: [
        { q: t('legal.faq.bookingQ1'), a: t('legal.faq.bookingA1') },
        { q: t('legal.faq.bookingQ2'), a: t('legal.faq.bookingA2') },
        { q: t('legal.faq.bookingQ3'), a: t('legal.faq.bookingA3') },
      ],
    },
    {
      title: t('legal.faq.paymentTitle'),
      items: [
        { q: t('legal.faq.paymentQ1'), a: t('legal.faq.paymentA1') },
        { q: t('legal.faq.paymentQ2'), a: t('legal.faq.paymentA2') },
        { q: t('legal.faq.paymentQ3'), a: t('legal.faq.paymentA3') },
      ],
    },
    {
      title: t('legal.faq.lawyerTitle'),
      items: [
        { q: t('legal.faq.lawyerQ1'), a: t('legal.faq.lawyerA1') },
        { q: t('legal.faq.lawyerQ2'), a: t('legal.faq.lawyerA2') },
        { q: t('legal.faq.lawyerQ3'), a: t('legal.faq.lawyerA3') },
      ],
    },
    {
      title: t('legal.faq.aiTitle'),
      items: [
        { q: t('legal.faq.aiQ1'), a: t('legal.faq.aiA1') },
        { q: t('legal.faq.aiQ2'), a: t('legal.faq.aiA2') },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-emerald-50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('legal.faq.title')}</h1>
          </div>
          <p className="mt-3 max-w-2xl text-emerald-50">{t('legal.faq.intro')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {sections.map((section, si) => (
            <div key={si}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map((item, ii) => (
                  <FaqItem key={ii} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
          <p className="font-semibold text-slate-900">{t('legal.faq.stillHaveQuestions')}</p>
          <a href="mailto:support@nyaya.com.bd" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
            <Mail className="h-4 w-4" /> {t('legal.faq.contactSupport')}
          </a>
        </div>
      </div>
    </div>
  );
}
