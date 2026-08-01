import { useTranslation } from 'react-i18next';
import { Star, BadgeCheck, MapPin, Loader2 } from 'lucide-react';
import type { LawyerProfile, Profile, PracticeArea } from '@/lib/supabase';
import i18n from '@/lib/i18n';

export interface LawyerWithProfile {
  profile: Profile;
  lawyer: LawyerProfile;
  practice_areas: PracticeArea[];
}

export function LawyerCard({ lawyer }: { lawyer: LawyerWithProfile }) {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <div className="flex items-start gap-4 p-5">
        <div className="relative">
          {lawyer.profile.avatar_url ? (
            <img src={lawyer.profile.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-lg font-bold text-emerald-700">
              {lawyer.profile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          {lawyer.lawyer.verification_status === 'verified' && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
              <BadgeCheck className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">{lawyer.profile.full_name}</h3>
          {lawyer.lawyer.city && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" /> {lawyer.lawyer.city}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {lawyer.practice_areas.slice(0, 3).map((pa) => (
              <span key={pa.id} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                {isBn ? pa.name_bn : pa.name_en}
              </span>
            ))}
          </div>
        </div>
      </div>

      {lawyer.lawyer.bio && (
        <p className="px-5 text-sm leading-relaxed text-slate-600 line-clamp-2">{lawyer.lawyer.bio}</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 p-5">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-semibold text-slate-900">
            {lawyer.lawyer.rating_avg.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500">({lawyer.lawyer.rating_count})</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{t('common.consultationFee')}</p>
          <p className="text-base font-bold text-emerald-600">
            {t('common.currency')}{lawyer.lawyer.consultation_fee}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="mt-3 text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
