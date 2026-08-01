import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Calendar, Eye, ArrowLeft, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/lib/supabase';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import i18n from '@/lib/i18n';

const categories = ['family', 'criminal', 'corporate', 'property', 'labor', 'cyber', 'constitutional', 'general'];

const seedArticles: Omit<Article, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    title_en: 'Understanding Tenant Rights in Bangladesh',
    title_bn: 'বাংলাদেশে ভাড়াটিয়া অধিকার বোঝা',
    summary_en: 'A comprehensive guide to the Premises Rent Control Act and what tenants need to know.',
    summary_bn: 'প্রিমাইসেস রেন্ট কন্ট্রোল আইন এবং ভাড়াটিয়াদের জানা প্রয়োজন একটি পূর্ণাঙ্গ গাইড।',
    body_en: 'The Premises Rent Control Act 1991 governs landlord-tenant relationships in Bangladesh. Tenants have the right to a written agreement, protection against arbitrary eviction, and fair rent. The Rent Controller has jurisdiction over disputes. A landlord must give 90 days notice before seeking eviction. Rent increases require justification and proper notice. Tenants should always insist on a written tenancy agreement and keep records of all payments.',
    body_bn: 'প্রিমাইসেস রেন্ট কন্ট্রোল আইন ১৯৯১ বাংলাদেশে বাড়িওয়ালা-ভাড়াটিয়া সম্পর্ক নিয়ন্ত্রণ করে। ভাড়াটিয়াদের লিখিত চুক্তি, স্বেচ্ছাচারী উচ্ছেদ থেকে সুরক্ষা, এবং ন্যায্য ভাড়ার অধিকার আছে। রেন্ট কন্ট্রোলার বিরোধের এখতিয়ার রাখেন। উচ্ছেদের আগে বাড়িওয়ালাকে ৯০ দিনের নোটিশ দিতে হবে। ভাড়া বৃদ্ধির জন্য যৌক্তিক কারণ ও সঠিক নোটিশ প্রয়োজন।',
    category: 'property',
    cover_image_url: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    author_id: null,
    status: 'published',
    views: 1240,
  },
  {
    title_en: 'How to File an FIR: A Step-by-Step Guide',
    title_bn: 'এফআইআর দায়ের করার পদ্ধতি: ধাপে ধাপে গাইড',
    summary_en: 'Everything you need to know about filing a First Information Report at a Bangladeshi police station.',
    summary_bn: 'বাংলাদেশি থানায় ফার্স্ট ইনফরমেশন রিপোর্ট দায়ের করা সম্পর্কে সবকিছু।',
    body_en: 'An FIR is the first step in criminal proceedings. Visit the police station with jurisdiction, provide information about the cognizable offense, and the officer will record it. You must sign the FIR and receive a free copy. If refused, you can complain to the Superintendent of Police under Section 200 of the BNCC. Always bring identification and any evidence.',
    body_bn: 'এফআইআর ফৌজদারি কার্যক্রমের প্রথম ধাপ। এখতিয়ার সম্পন্ন থানায় যান, অপরাধ সম্পর্কে তথ্য দিন, কর্মকর্তা লিখবেন। আপনাকে স্বাক্ষর করতে হবে এবং বিনামূল্যে কপি পাবেন। অস্বীকার হলে বিএনসিসি ধারা ২০০ অনুযায়ী পুলিশ সুপারের কাছে অভিযোগ করতে পারেন।',
    category: 'criminal',
    cover_image_url: 'https://images.pexels.com/photos/5668472/pexels-photo-5668472.jpeg?auto=compress&cs=tinysrgb&w=800',
    author_id: null,
    status: 'published',
    views: 980,
  },
  {
    title_en: 'Muslim Inheritance Law: A Practical Overview',
    title_bn: 'মুসলিম উত্তরাধিকার আইন: একটি ব্যবহারিক পরিসংখ্যান',
    summary_en: 'Understanding the Quranic rules of fara\'id and how property is distributed among heirs.',
    summary_bn: 'ফারায়েজের কুরআনিক নিয়ম এবং উত্তরাধিকারীদের মধ্যে সম্পত্তি বণ্টন বোঝা।',
    body_en: 'Muslim inheritance follows the rules of fara\'id as outlined in the Quran. Sons inherit twice the share of daughters. A wife receives 1/8 with children or 1/4 without. A husband receives 1/4 with children or 1/2 without. Parents receive 1/6 each when there are children. Distribution occurs after paying debts and funeral expenses. A wasiyyat (will) can only cover 1/3 of the estate.',
    body_bn: 'মুসলিম উত্তরাধিকার কুরআনে বর্ণিত ফারায়েজ নিয়ম অনুসরণ করে। পুত্র কন্যার দ্বিগুণ পায়। স্ত্রী সন্তান থাকলে ১/৮, না থাকলে ১/৪ পান। স্বামী সন্তান থাকলে ১/৪, না থাকলে ১/২ পান। পিতামাতা সন্তান থাকলে ১/৬ করে পান। ঋণ ও জানাজা খরচ পরিশোধের পর বণ্টন।',
    category: 'family',
    cover_image_url: 'https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg?auto=compress&cs=tinysrgb&w=800',
    author_id: null,
    status: 'published',
    views: 1560,
  },
];

export function ArticlesListPage() {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      let rows = (data as Article[]) ?? [];
      if (rows.length === 0) {
        const { data: seeded } = await supabase.from('articles').insert(seedArticles).select('*');
        rows = (seeded as Article[]) ?? [];
      }
      setArticles(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = articles.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const title = isBn ? a.title_bn : a.title_en;
      if (!title.toLowerCase().includes(q)) return false;
    }
    if (category && a.category !== category) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('articles.title')}</h1>
          <p className="mt-2 max-w-2xl mx-auto text-emerald-50">{t('articles.subtitle')}</p>
          <div className="mt-6 relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('articles.searchPlaceholder')}
              className="w-full rounded-xl border-0 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-white/20 focus:ring-emerald-300"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !category ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('articles.allCategories')}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                category === c ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t(`articles.category${c.charAt(0).toUpperCase() + c.slice(1)}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState message={t('articles.noArticles')} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Link
                key={a.id}
                to={`/articles/${a.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {a.cover_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img src={a.cover_image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                )}
                <div className="p-5">
                  {a.category && (
                    <span className="text-xs font-medium text-emerald-600">{t(`articles.category${a.category.charAt(0).toUpperCase() + a.category.slice(1)}`)}</span>
                  )}
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 line-clamp-2">{isBn ? a.title_bn : a.title_en}</h3>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{isBn ? a.summary_bn : a.summary_en}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(a.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {a.views}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArticleDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
      if (data) {
        setArticle(data as Article);
        await supabase.from('articles').update({ views: (data as Article).views + 1 }).eq('id', id);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!article) return <EmptyState message={t('articles.noArticles')} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {article.cover_image_url && (
        <div className="h-64 w-full overflow-hidden sm:h-80">
          <img src={article.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/articles" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4" /> {t('articles.backToArticles')}
        </Link>
        {article.category && (
          <span className="mt-4 inline-block text-xs font-medium text-emerald-600">
            {t(`articles.category${article.category.charAt(0).toUpperCase() + article.category.slice(1)}`)}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{isBn ? article.title_bn : article.title_en}</h1>
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(article.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {article.views} {t('articles.views')}</span>
        </div>
        {article.summary_en && (
          <p className="mt-6 rounded-xl bg-emerald-50/50 p-4 text-base leading-relaxed text-slate-700">
            {isBn ? article.summary_bn : article.summary_en}
          </p>
        )}
        <div className="mt-6 prose prose-slate max-w-none">
          <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{isBn ? article.body_bn : article.body_en}</p>
        </div>
        <div className="mt-8 flex items-center gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          {t('ai.disclaimer')}
        </div>
      </div>
    </div>
  );
}
