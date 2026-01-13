import { observer } from 'mobx-react-lite';
import { SettingsLayout } from '@/components/LuminaSettingsNew/SettingsLayout';
import { settingsConfig } from '@/components/LuminaSettingsNew/settingsConfig';

const Page = observer(() => {
  return <SettingsLayout config={settingsConfig} />;
});

export default Page;
