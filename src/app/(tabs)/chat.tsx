import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ChatScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('chat.title')} message={t('chat.placeholder')} icon="chatbubbles-outline" />;
}
