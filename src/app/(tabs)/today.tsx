import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function TodayScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('today.title')} message={t('today.placeholder')} icon="camera-outline" />;
}
