import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function FeedScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('feed.title')}
      message={t('feed.placeholder')}
      icon="images-outline"
    />
  );
}
