import { useTranslation } from 'react-i18next';
import LegalPage from '@/components/LegalPage';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = [
    { id: 'collection', title: t('legal.privacy.collectionTitle'), body: t('legal.privacy.collectionBody') },
    { id: 'use', title: t('legal.privacy.useTitle'), body: t('legal.privacy.useBody') },
    { id: 'sharing', title: t('legal.privacy.sharingTitle'), body: t('legal.privacy.sharingBody') },
    { id: 'security', title: t('legal.privacy.securityTitle'), body: t('legal.privacy.securityBody') },
    { id: 'retention', title: t('legal.privacy.retentionTitle'), body: t('legal.privacy.retentionBody') },
    { id: 'cookies', title: t('legal.privacy.cookiesTitle'), body: t('legal.privacy.cookiesBody') },
    { id: 'rights', title: t('legal.privacy.rightsTitle'), body: t('legal.privacy.rightsBody') },
    { id: 'children', title: t('legal.privacy.childrenTitle'), body: t('legal.privacy.childrenBody') },
    { id: 'changes', title: t('legal.privacy.changesTitle'), body: t('legal.privacy.changesBody') },
    { id: 'contact', title: t('legal.privacy.contactTitle'), body: t('legal.privacy.contactBody') },
  ];
  return <LegalPage title={t('legal.privacy.title')} intro={t('legal.privacy.intro')} sections={sections} />;
}
