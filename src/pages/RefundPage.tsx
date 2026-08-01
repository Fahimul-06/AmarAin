import { useTranslation } from 'react-i18next';
import LegalPage from '@/components/LegalPage';

export default function RefundPage() {
  const { t } = useTranslation();
  const sections = [
    { id: 'eligibility', title: t('legal.refund.eligibilityTitle'), body: t('legal.refund.eligibilityBody') },
    { id: 'non-refundable', title: t('legal.refund.nonRefundableTitle'), body: t('legal.refund.nonRefundableBody') },
    { id: 'process', title: t('legal.refund.processTitle'), body: t('legal.refund.processBody') },
    { id: 'partial', title: t('legal.refund.partialTitle'), body: t('legal.refund.partialBody') },
    { id: 'wallet', title: t('legal.refund.walletTitle'), body: t('legal.refund.walletBody') },
    { id: 'document', title: t('legal.refund.documentTitle'), body: t('legal.refund.documentBody') },
    { id: 'contact', title: t('legal.refund.contactTitle'), body: t('legal.refund.contactBody') },
  ];
  return <LegalPage title={t('legal.refund.title')} intro={t('legal.refund.intro')} sections={sections} />;
}
