import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Wallet, Calendar, FileText, Star, AlertTriangle, User, BarChart3, Users, ShieldCheck, BookOpen, CreditCard, Receipt, Banknote, Bell, Bot, FileBarChart, History, Lock, Settings as SettingsIcon, Siren } from 'lucide-react';
import i18n from '@/lib/i18n';

export interface NavItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export function DashboardShell({
  title, navItems, activeKey, onNavigate, children,
}: {
  title: string;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <nav className="sticky top-20 space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'emerald' }: {
  label: string;
  value: string | number;
  icon: typeof LayoutDashboard;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'teal' | 'slate';
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    teal: 'bg-teal-50 text-teal-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export const clientNav = (t: (k: string) => string): NavItem[] => [
  { key: 'overview', label: t('clientDashboard.overview'), icon: LayoutDashboard },
  { key: 'bookings', label: t('clientDashboard.myBookings'), icon: Calendar },
  { key: 'documents', label: t('clientDashboard.myDocuments'), icon: FileText },
  { key: 'wallet', label: t('clientDashboard.myWallet'), icon: Wallet },
  { key: 'reviews', label: t('clientDashboard.myReviews'), icon: Star },
  { key: 'disputes', label: t('clientDashboard.disputes'), icon: AlertTriangle },
  { key: 'settings', label: t('clientDashboard.settings'), icon: SettingsIcon },
];

export const lawyerNav = (t: (k: string) => string): NavItem[] => [
  { key: 'overview', label: t('lawyerDashboard.overview'), icon: LayoutDashboard },
  { key: 'emergency', label: t('lawyerDashboard.emergencyService'), icon: Siren },
  { key: 'bookings', label: t('lawyerDashboard.myBookings'), icon: Calendar },
  { key: 'earnings', label: t('lawyerDashboard.myEarnings'), icon: Wallet },
  { key: 'profile', label: t('lawyerDashboard.myProfile'), icon: User },
  { key: 'documents', label: t('lawyerDashboard.documents'), icon: FileText },
  { key: 'reviews', label: t('lawyerDashboard.reviews'), icon: Star },
  { key: 'disputes', label: t('lawyerDashboard.disputes'), icon: AlertTriangle },
  { key: 'settings', label: t('lawyerDashboard.settings'), icon: SettingsIcon },
];

export const adminNav = (t: (k: string) => string): NavItem[] => [
  { key: 'overview', label: t('admin.overview'), icon: LayoutDashboard },
  { key: 'users', label: t('admin.users'), icon: Users },
  { key: 'lawyers', label: t('admin.lawyers'), icon: ShieldCheck },
  { key: 'verification', label: t('admin.verification'), icon: ShieldCheck },
  { key: 'content', label: t('admin.content'), icon: BookOpen },
  { key: 'bookings', label: t('admin.bookings'), icon: Calendar },
  { key: 'consultations', label: t('admin.consultations'), icon: FileText },
  { key: 'payments', label: t('admin.payments'), icon: CreditCard },
  { key: 'refunds', label: t('admin.refunds'), icon: Receipt },
  { key: 'commissions', label: t('admin.commissions'), icon: Banknote },
  { key: 'withdrawals', label: t('admin.withdrawals'), icon: Wallet },
  { key: 'disputes', label: t('admin.disputes'), icon: AlertTriangle },
  { key: 'reviews', label: t('admin.reviews'), icon: Star },
  { key: 'ai', label: t('admin.aiMonitoring'), icon: Bot },
  { key: 'reports', label: t('admin.reports'), icon: BarChart3 },
  { key: 'audit', label: t('admin.auditLogs'), icon: History },
  { key: 'roles', label: t('admin.rolesPermissions'), icon: Lock },
  { key: 'settings', label: t('admin.systemSettings'), icon: SettingsIcon },
];

export { i18n };
