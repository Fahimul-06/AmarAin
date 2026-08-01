import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Star, BadgeCheck, MapPin, Clock, Languages, Award, ArrowLeft, Calendar, MessageSquare, Phone, Video, User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LawyerProfile, Profile, PracticeArea, Review } from '@/lib/supabase';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import i18n from '@/lib/i18n';

type LawyerDetail = LawyerProfile & {
  profiles: Profile;
  lawyer_practice_areas: { practice_areas: PracticeArea }[];
};

interface ReviewWithProfile extends Review {
  profiles: { full_name: string; avatar_url: string | null };
}

const consultationTypes = [
  { key: 'chat', icon: MessageSquare },
  { key: 'audio', icon: Phone },
  { key: 'video', icon: Video },
  { key: 'in_person', icon: User },
] as const;

export default function LawyerProfilePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isBn = i18n.language === 'bn';
  const [lawyer, setLawyer] = useState<LawyerDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('lawyer_profiles')
        .select(`
          *,
          profiles!inner ( id, full_name, phone, avatar_url, role, preferred_language, created_at, updated_at ),
          lawyer_practice_areas ( practice_areas ( id, name_en, name_bn, icon ) )
        `)
        .eq('id', id)
        .maybeSingle();
      setLawyer(data ? ({ ...(data as unknown as LawyerDetail), lawyer_practice_areas: (data as any).lawyer_practice_areas ?? [] } as LawyerDetail) : null);

      if (data) {
        const { data: reviewData } = await supabase
          .from('reviews')
          .select(`
            id, consultation_id, client_id, lawyer_id, rating, body, created_at,
            profiles!reviews_client_id_fkey ( full_name, avatar_url )
          `)
          .eq('lawyer_id', (data as unknown as LawyerDetail).user_id)
          .order('created_at', { ascending: false })
          .limit(10);
        setReviews((reviewData as unknown as ReviewWithProfile[]) ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!lawyer) return <EmptyState message={t('empty.noLawyers')} />;

  const isVerified = lawyer.verification_status === 'verified';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link to="/lawyers" className="inline-flex items-center gap-1.5 text-sm text-emerald-50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative">
                  {lawyer.profiles.avatar_url ? (
                    <img src={lawyer.profiles.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-bold text-emerald-700">
                      {lawyer.profiles.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isVerified && (
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                      <BadgeCheck className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900">{lawyer.profiles.full_name}</h1>
                  {isVerified && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <BadgeCheck className="h-3 w-3" /> {t('common.verified')}
                    </span>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                    {lawyer.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-600" /> {lawyer.city}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-emerald-600" /> {lawyer.experience_years} {t('common.yearsExperience')}</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {lawyer.rating_avg.toFixed(1)} ({lawyer.rating_count})
                    </span>
                  </div>
                </div>
              </div>

              {lawyer.bio && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('common.bio')}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{lawyer.bio}</p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('common.practiceAreas')}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lawyer.lawyer_practice_areas.map((lpa) => (
                      <span key={lpa.practice_areas.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {isBn ? lpa.practice_areas.name_bn : lpa.practice_areas.name_en}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t('common.languages')}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lawyer.languages.length > 0 ? lawyer.languages.map((lang) => (
                      <span key={lang} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <Languages className="h-3 w-3" /> {lang}
                      </span>
                    )) : <span className="text-xs text-slate-500">English</span>}
                  </div>
                </div>
              </div>

              {lawyer.license_number && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <Award className="h-4 w-4 text-emerald-600" />
                  {t('common.licenseNumber')}: {lawyer.license_number}
                  {lawyer.bar_association ? ` · ${lawyer.bar_association}` : ''}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{t('common.reviews')}</h2>
              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{t('marketplace.noReviewsYet')}</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
                      <div className="flex items-center gap-3">
                        {r.profiles?.avatar_url ? (
                          <img src={r.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                            {r.profiles?.full_name?.charAt(0).toUpperCase() ?? 'C'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.profiles?.full_name ?? t('review.verifiedClient')}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      {r.body && <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-center">
                <p className="text-sm text-slate-500">{t('common.consultationFee')}</p>
                <p className="text-3xl font-bold text-emerald-600">{t('common.currency')}{lawyer.consultation_fee}</p>
              </div>

              <div className="mt-6 space-y-2">
                {consultationTypes.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <div key={ct.key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <Icon className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">{t(`booking.type${ct.key.charAt(0).toUpperCase() + ct.key.slice(1)}`)}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => navigate(`/book/${lawyer.id}`)}
                disabled={!isVerified}
                className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('common.bookConsultation')}
              </button>
              {!isVerified && (
                <p className="mt-2 text-center text-xs text-amber-600">{t('lawyerDashboard.verificationPending')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
