import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language === 'bn' ? 'bn' : 'en';

  const toggle = () => {
    const next = current === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span>{current === 'en' ? 'বাংলা' : 'English'}</span>
    </button>
  );
}
