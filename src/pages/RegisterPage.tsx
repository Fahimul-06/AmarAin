import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, Mail, Lock, User as UserIcon, Phone, AlertCircle, Loader2, Briefcase, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LanguageToggle from '@/components/LanguageToggle';
import type { Role } from '@/lib/supabase';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone, role);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate(role === 'lawyer' ? '/lawyer' : '/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">{t('common.appName')}</span>
          </Link>
          <LanguageToggle />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">{t('auth.registerTitle')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('auth.registerSubtitle')}</p>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-slate-700">{t('auth.selectRole')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                  role === 'client'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <UserCircle className="h-7 w-7" />
                <span className="text-sm font-medium">{t('auth.registerAsClient')}</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('lawyer')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                  role === 'lawyer'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Briefcase className="h-7 w-7" />
                <span className="text-sm font-medium">{t('auth.registerAsLawyer')}</span>
              </button>
            </div>
            {role === 'lawyer' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t('auth.lawyerVerificationNote')}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.nameLabel')}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder={t('common.fullName')}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.emailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.phoneLabel')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.passwordLabel')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.confirmPasswordLabel')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('auth.signingUp') : t('common.register')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              {t('auth.signInNow')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
