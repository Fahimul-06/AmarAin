import { useTranslation } from 'react-i18next';
import LegalPage from '@/components/LegalPage';

export default function TermsPage() {
  const { t } = useTranslation();
  const sections = [
    { id: 'acceptance', title: t('legal.terms.acceptanceTitle'), body: t('legal.terms.acceptanceBody') },
    { id: 'definitions', title: t('legal.terms.definitionsTitle'), body: t('legal.terms.definitionsBody') },
    { id: 'accounts', title: t('legal.terms.accountsTitle'), body: t('legal.terms.accountsBody') },
    { id: 'verification', title: t('legal.terms.lawyerVerificationTitle'), body: t('legal.terms.lawyerVerificationBody') },
    { id: 'consultations', title: t('legal.terms.consultationsTitle'), body: t('legal.terms.consultationsBody') },
    { id: 'payments', title: t('legal.terms.paymentsTitle'), body: t('legal.terms.paymentsBody') },
    { id: 'reviews', title: t('legal.terms.reviewsTitle'), body: t('legal.terms.reviewsBody') },
    { id: 'disputes', title: t('legal.terms.disputesTitle'), body: t('legal.terms.disputesBody') },
    { id: 'prohibited', title: t('legal.terms.prohibitedTitle'), body: t('legal.terms.prohibitedBody') },
    { id: 'liability', title: t('legal.terms.liabilityTitle'), body: t('legal.terms.liabilityBody') },
    { id: 'ai', title: t('legal.terms.aiTitle'), body: t('legal.terms.aiBody') },
    { id: 'changes', title: t('legal.terms.changesTitle'), body: t('legal.terms.changesBody') },
    { id: 'contact', title: t('legal.terms.contactTitle'), body: t('legal.terms.contactBody') },
  ];
  return <LegalPage title={t('legal.terms.title')} intro={t('legal.terms.intro')} sections={sections} />;
}
