import { useMediaQuery } from 'usehooks-ts';
import { IconButton } from '../IconButton';
import { useTranslation } from 'react-i18next';

interface Props {
  isFullscreen: boolean;
  onClick: () => void;
}

export const FullScreenButton = ({ isFullscreen, onClick }: Props) => {
  const { t } = useTranslation();
  const isPc = useMediaQuery('(min-width: 768px)');

  return (
    <IconButton
      tooltip={isFullscreen ? t('exit-fullscreen') : t('fullscreen')}
      icon={isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'}
      onClick={onClick}
    />
  );
}; 