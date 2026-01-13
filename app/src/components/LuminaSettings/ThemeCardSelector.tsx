import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

interface ThemeCardSelectorProps {
  onChange?: (theme: string) => Promise<any>;
}

const themes = [
  { id: 'light', name: 'light', icon: 'ri-sun-line', bg: '#F8F9FC' },
  { id: 'dark', name: 'dark', icon: 'ri-moon-line', bg: '#111827' },
  { id: 'system', name: 'follow-system', icon: 'ri-computer-line', bg: '#F8F9FC', gradient: true },
];

const ThemeCardSelector = observer(({ onChange }: ThemeCardSelectorProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleThemeChange = async (themeId: string) => {
    await onChange?.(themeId);
    if (themeId === 'system') {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      setTheme(themeId);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {themes.map((th) => (
        <button
          key={th.id}
          onClick={() => handleThemeChange(th.id)}
          className={`
            glass-card p-3 cursor-pointer transition-all
            ${theme === th.id ? 'ring-2 ring-violet-500 bg-white/80' : 'opacity-70 hover:opacity-100'}
          `}
        >
          <div className="h-20 rounded-lg mb-2 relative overflow-hidden border" style={{ backgroundColor: th.bg }}>
            {th.gradient && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#F8F9FC] to-[#111827]"></div>
            )}
            <div className="absolute left-2 top-2 w-6 h-full bg-white/80 border-r border-gray-200"></div>
            <i className={`${th.icon} absolute right-2 top-2 text-violet-500 text-lg`}></i>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold text-gray-900">{t(th.name)}</span>
            {theme === th.id && <i className="ri-checkbox-circle-fill text-violet-600 text-base"></i>}
          </div>
        </button>
      ))}
    </div>
  );
});

export default ThemeCardSelector;
