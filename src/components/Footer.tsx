import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, Facebook, Twitter, Linkedin, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-slate-900">{t('common.appName')}</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{t('footer.aboutDesc')}</p>
            <div className="mt-4 flex gap-3">
              {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('footer.quickLinks')}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/lawyers" className="text-slate-600 hover:text-emerald-600">{t('nav.marketplace')}</Link></li>
              <li><Link to="/ai-assistant" className="text-slate-600 hover:text-emerald-600">{t('nav.aiAssistant')}</Link></li>
              <li><Link to="/articles" className="text-slate-600 hover:text-emerald-600">{t('nav.articles')}</Link></li>
              <li><Link to="/documents" className="text-slate-600 hover:text-emerald-600">{t('nav.documents')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('footer.legal')}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/terms" className="text-slate-600 hover:text-emerald-600">{t('common.termsOfService')}</Link></li>
              <li><Link to="/privacy" className="text-slate-600 hover:text-emerald-600">{t('common.privacyPolicy')}</Link></li>
              <li><Link to="/refund-policy" className="text-slate-600 hover:text-emerald-600">{t('legal.refund.title')}</Link></li>
              <li><Link to="/faq" className="text-slate-600 hover:text-emerald-600">{t('common.faq')}</Link></li>
              <li><Link to="/register" className="text-slate-600 hover:text-emerald-600">{t('footer.joinAsLawyer')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('footer.contactUs')}</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" /> Gulshan, Dhaka, Bangladesh
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" /> +880 1700-000000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600" /> support@nyaya.com.bd
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">{t('footer.disclaimer')}</p>
          <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-center text-sm text-slate-500">{t('common.copyright')}</p>
            <Link
              to="/login?portal=admin"
              aria-label={t('footer.adminLogin')}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('footer.adminLogin')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
