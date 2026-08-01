import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Scale, Menu, X, Bell, User as UserIcon, LogOut, LayoutDashboard,
} from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import i18n from '@/lib/i18n';

export default function Navbar() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/lawyers', label: t('nav.marketplace'), hideForLawyer: true },
    { to: '/emergency', label: t('nav.emergency'), hideForLawyer: true },
    { to: '/ai-assistant', label: t('nav.aiAssistant'), hideForLawyer: false },
    { to: '/articles', label: t('nav.articles'), hideForLawyer: false },
    { to: '/documents', label: t('nav.documents'), hideForLawyer: false },
  ].filter((link) => !(link.hideForLawyer && profile?.role === 'lawyer'));

  const dashboardLink =
    profile?.role === 'admin' ? '/admin'
      : profile?.role === 'lawyer' ? '/lawyer'
      : '/dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">{t('common.appName')}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(link.to)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>

          {profile ? (
            <>
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead(); }}
                  className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
                      {t('common.notifications')}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          {t('notification.noNotifications')}
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="border-b border-slate-50 px-4 py-3 hover:bg-slate-50">
                            <p className="text-sm font-medium text-slate-900">
                              {i18n.language === 'bn' ? n.title_bn : n.title_en}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {i18n.language === 'bn' ? n.body_bn : n.body_en}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{profile.full_name}</p>
                      <p className="text-xs capitalize text-slate-500">{t(`common.${profile.role}`)}</p>
                    </div>
                    <Link
                      to={dashboardLink}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="h-4 w-4" /> {t('common.dashboard')}
                    </Link>
                    <Link
                      to={dashboardLink}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="h-4 w-4" /> {t('common.profile')}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" /> {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                {t('common.register')}
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <LanguageToggle />
            </div>
            {!profile && (
              <div className="flex gap-2 pt-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700">
                  {t('common.login')}
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white">
                  {t('common.register')}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
