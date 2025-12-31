import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { observer } from 'mobx-react-lite';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface ThemeSwitcherProps {
  onChange?: (theme: string) => Promise<any>;
}

const ThemeSwitcher = observer(({ onChange }: ThemeSwitcherProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex items-center gap-2">
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="flat"
            isIconOnly
            type="button"
            className="py-2 transition duration-300 ease-in-out cursor-pointer"
          >
            {theme === 'dark' ? (
              <i className="ri-moon-line text-2xl"></i>
            ) : (
              <i className="ri-sun-line text-2xl"></i>
            )}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          onAction={async (key) => {
            await onChange?.(key.toString());
            if (key === 'system') {
              setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            } else {
              setTheme(key.toString())
            }
          }}
        >
          <DropdownItem key="light" startContent={<i className="ri-sun-line"></i>}>
            {t('light-mode')}
          </DropdownItem>
          <DropdownItem key="dark" startContent={<i className="ri-moon-line"></i>}>
            {t('dark-mode')}
          </DropdownItem>
          <DropdownItem key="system" startContent={<i className="ri-computer-line"></i>}>
            {t('follow-system')}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
});

export default ThemeSwitcher;
