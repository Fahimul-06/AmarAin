import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminPortal = searchParams.get('portal') === 'admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error, role } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      if (isAdminPortal && role !== 'admin') {
        await signOut();
        setError(t('auth.adminOnly', { defaultValue: 'This account does not have administrator access.' }));
        return;
      }
      if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'lawyer') navigate('/lawyer', { replace: true });
      else navigate('/dashboard', { replace: true });
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
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdminPortal ? t('footer.adminLogin') : t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isAdminPortal
              ? t('auth.adminLoginSubtitle', { defaultValue: 'Sign in with the administrator credentials configured on the server.' })
              : t('auth.loginSubtitle')}
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('auth.signingIn') : t('common.login')}
            </button>
          </form>

          {!isAdminPortal && (
            <p className="mt-6 text-center text-sm text-slate-600">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
                {t('auth.signUpNow')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
