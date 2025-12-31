import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/dropdown";
import { Button } from '@heroui/react';
import { RootStore } from '@/store';
import { BaseStore } from '@/store/baseStore';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  value?: string;
  onChange?: (value: string) => void;
}

const LanguageSwitcher = ({ value, onChange }: LanguageSwitcherProps = {}) => {
  const baseStore = RootStore.Get(BaseStore)
  const { i18n } = useTranslation();

  function onSelectChange(nextLocale: string) {
    baseStore.changeLanugage(i18n, nextLocale)
    onChange?.(nextLocale)
  }

  const currentLocale = value || baseStore.locale.value

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="flat" startContent={<i className="ri-global-line text-2xl"></i>}>
          {baseStore.locales.find(i => i.value === currentLocale)?.label}
        </Button>
      </DropdownTrigger>

      <DropdownMenu className="p-2 space-y-1">
        {baseStore.locales.map((locale) => (
          <DropdownItem
            key={locale.value}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => {
              onSelectChange(locale.value);
            }}
          >
            <div className='flex'> {locale.label}
              {currentLocale === locale.value && <i className="ri-check-fill ml-auto" style={{fontSize: "18px"}}></i>}</div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
