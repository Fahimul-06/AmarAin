import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LawyerProfile, Profile, PracticeArea } from '@/lib/supabase';
import { LawyerCard, LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import i18n from '@/lib/i18n';

type LawyerRow = {
  id: string;
  user_id: string;
  license_number: string | null;
  bar_association: string | null;
  bio: string | null;
  experience_years: number;
  hourly_rate: number;
  consultation_fee: number;
  city: string | null;
  languages: string[];
  verification_status: string;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  profiles: Profile;
  lawyer_practice_areas: { practice_areas: PracticeArea }[];
};

export default function MarketplacePage() {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [practiceAreas, setPracticeAreas] = useState<PracticeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    (async () => {
      setLoadError('');
      const [lawyerResult, areaResult] = await Promise.all([
        supabase
          .from('lawyer_profiles')
          .select(`
            id, user_id, license_number, bar_association, bio, experience_years,
            hourly_rate, consultation_fee, city, languages, verification_status,
            is_available, rating_avg, rating_count,
            profiles!inner (id, full_name, phone, avatar_url, role, preferred_language, created_at, updated_at),
            lawyer_practice_areas ( practice_areas ( id, name_en, name_bn, icon ) )
          `)
          .eq('verification_status', 'verified')
          .order('rating_avg', { ascending: false }),
        supabase.from('practice_areas').select('*').order('name_en'),
      ]);
      const { data: lawyerData, error: lawyerError } = lawyerResult;
      const { data: areaData, error: areaError } = areaResult;
      if (lawyerError || areaError) setLoadError(lawyerError?.message || areaError?.message || 'Unable to load lawyers');
      const safeLawyers = ((lawyerData as unknown as LawyerRow[]) ?? []).map((lawyer) => ({
        ...lawyer,
        lawyer_practice_areas: lawyer.lawyer_practice_areas ?? [],
      })).filter((lawyer) => lawyer.profiles);
      setLawyers(safeLawyers);
      setPracticeAreas((areaData as PracticeArea[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(lawyers.map((l) => l.city).filter(Boolean))) as string[],
    [lawyers]
  );

  const filtered = useMemo(() => {
    let result = lawyers.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (l.profiles?.full_name ?? '').toLowerCase().includes(q);
        const areaMatch = l.lawyer_practice_areas.some(
          (lpa) => lpa.practice_areas?.name_en.toLowerCase().includes(q) || lpa.practice_areas?.name_bn.includes(q)
        );
        const cityMatch = l.city?.toLowerCase().includes(q);
        if (!nameMatch && !areaMatch && !cityMatch) return false;
      }
      if (filterArea) {
        const match = l.lawyer_practice_areas.some((lpa) => lpa.practice_areas?.id === filterArea);
        if (!match) return false;
      }
      if (filterCity && l.city !== filterCity) return false;
      if (filterRating && l.rating_avg < filterRating) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'experience': return b.experience_years - a.experience_years;
        case 'priceLow': return a.consultation_fee - b.consultation_fee;
        case 'priceHigh': return b.consultation_fee - a.consultation_fee;
        default: return b.rating_avg - a.rating_avg;
      }
    });
    return result;
  }, [lawyers, search, filterArea, filterCity, filterRating, sortBy]);

  const mapped = filtered.map((l) => ({
    profile: l.profiles,
    lawyer: l as unknown as LawyerProfile,
    practice_areas: l.lawyer_practice_areas.map((lpa) => lpa.practice_areas).filter(Boolean),
  }));

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('marketplace.title')}</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">{t('marketplace.subtitle')}</p>
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-white/20 transition focus:ring-emerald-300"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Filters */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">{t('common.filter')}</h2>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('marketplace.filterPracticeArea')}</label>
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value="">{t('common.all')}</option>
                    {practiceAreas.map((pa) => (
                      <option key={pa.id} value={pa.id}>{isBn ? pa.name_bn : pa.name_en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('marketplace.filterCity')}</label>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value="">{t('common.all')}</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('marketplace.filterRating')}</label>
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value={0}>{t('marketplace.anyRating')}</option>
                    <option value={4}>4+ ★</option>
                    <option value={4.5}>4.5+ ★</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('marketplace.sortBy')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value="rating">{t('marketplace.sortRating')}</option>
                    <option value="experience">{t('marketplace.sortExperience')}</option>
                    <option value="priceLow">{t('marketplace.sortPriceLow')}</option>
                    <option value="priceHigh">{t('marketplace.sortPriceHigh')}</option>
                  </select>
                </div>
                <button
                  onClick={() => { setFilterArea(''); setFilterCity(''); setFilterRating(0); setSearch(''); }}
                  className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t('marketplace.clearFilters')}
                </button>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {t('marketplace.resultsCount', { count: filtered.length })}
              </p>
            </div>
            {loading ? (
              <LoadingSpinner />
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
            ) : filtered.length === 0 ? (
              <EmptyState message={t('marketplace.noLawyersFound')} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {mapped.map((lw) => (
                  <Link key={lw.lawyer.id} to={`/lawyers/${lw.lawyer.id}`}>
                    <LawyerCard lawyer={lw} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
