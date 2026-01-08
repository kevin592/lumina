import React, { useEffect, useState } from "react";
import { Button, Input, Checkbox, Image, Divider } from "@heroui/react";
import { Icon } from '@/components/Common/Iconify/icons';
import { RootStore } from "@/store";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { useTranslation } from "react-i18next";
import { StorageState } from "@/store/standard/StorageState";
import { UserStore } from "@/store/user";
import { PromiseState } from "@/store/standard/PromiseState";
import { useTheme } from "next-themes";
import { api, reinitializeTrpcApi } from "@/lib/trpc";
import { GradientBackground } from "@/components/Common/GradientBackground";
import { signIn } from "@/components/Auth/auth-client";
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import { saveluminaEndpoint, getSavedEndpoint, getluminaEndpoint } from "@/lib/luminaEndpoint";

type OAuthProvider = {
  id: string;
  name: string;
  icon?: string;
};

export default function Component() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [user, setUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [endpoint, setEndpoint] = React.useState("");
  const [canRegister, setCanRegister] = useState(false);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loadingProvider, setLoadingProvider] = useState<string>('');
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkTauriEnv = async () => {
      try {
        const isTauri = !!(window as any).__TAURI__;
        setIsTauriEnv(isTauri);
      } catch (error) {
        setIsTauriEnv(false);
      }
    };

    checkTauriEnv();
  }, []);

  useEffect(() => {
    api.public.oauthProviders.query().then(providers => {
      setProviders(providers);
    });
  }, []);

  const SignIn = new PromiseState({
    function: async () => {
      try {
        if (isTauriEnv) {
          reinitializeTrpcApi();
        }
        const res = await signIn('credentials', {
          username: user ?? userStorage.value,
          password: password ?? passwordStorage.value,
          callbackUrl: '/',
          redirect: false,
        });

        if (res?.requiresTwoFactor) {
          return res;
        }

        if (res?.ok) {
          navigate('/');
        }

        if (res?.error) {
          RootStore.Get(ToastPlugin).error(res.error);
        }

        return res;
      } catch (error) {
        console.error('SignIn error:', error);
        return { ok: false, error: 'Login failed' };
      }
    }
  });

  const userStorage = new StorageState({ key: 'username' });
  const passwordStorage = new StorageState({ key: 'password' });
  const endpointStorage = new StorageState({ key: 'luminaEndpoint' });

  useEffect(() => {
    try {
      RootStore.Get(UserStore).canRegister.call().then(v => {
        setCanRegister(v ?? false);
      });
      if (userStorage.value) {
        setUser(userStorage.value);
      }
      if (passwordStorage.value) {
        setPassword(passwordStorage.value);
      }
      if (getSavedEndpoint()) {
        setEndpoint(getSavedEndpoint());
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  }, []);

  const login = async () => {
    try {
      await SignIn.call();
      userStorage.setValue(user);
      passwordStorage.setValue(password);

      if (isTauriEnv && endpoint) {
        saveluminaEndpoint(endpoint);
      }
    } catch (error) {
      console.error('Login error:', error);
      RootStore.Get(ToastPlugin).error(t('login-failed'));
    }
  };

  return (
    <GradientBackground>
      <div className="flex h-full w-screen items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="flex w-full max-w-sm flex-col gap-4 glass-panel px-8 pb-10 pt-6">
          <p className="pb-2 text-xl font-medium flex gap-2 items-center justify-center">
            Login With <Image src={theme === 'light' ? '/logo-light-title.png' : '/logo-dark-title.png'} width={100} radius="lg"></Image>
          </p>

          {providers.length > 0 && (
            <>
              <div className="flex flex-col gap-4">
                {providers.map((provider) => (
                  <Button
                    key={provider.id}
                    className="w-full text-violet-700 bg-white/50 border border-white/60 hover:bg-white/80 shadow-sm"
                    radius="full"
                    startContent={provider.icon && <Icon icon={provider.icon} className="text-xl" />}
                    isLoading={loadingProvider === provider.id}
                    onPress={() => {
                      setLoadingProvider(provider.id);
                      window.location.href = `${getluminaEndpoint()}api/auth/${provider.id}`;
                    }}
                  >
                    {t('sign-in-with-provider', { provider: provider.name })}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 my-2">
                <Divider className="flex-1 opacity-50" />
                <span className="text-sm text-gray-500 font-medium">{t('or')}</span>
                <Divider className="flex-1 opacity-50" />
              </div>
            </>
          )}

          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            {isTauriEnv && (
              <Input
                label={t('Lumina-endpoint')}
                name="endpoint"
                placeholder={t('enter-Lumina-endpoint')}
                type="text"
                classNames={{
                  inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                  label: "text-gray-600"
                }}
                value={endpoint.replace(/"/g, '')}
                onChange={e => {
                  setEndpoint(e.target.value?.trim().replace(/"/g, ''))
                  endpointStorage.save(e.target.value?.trim().replace(/"/g, ''))
                }}
              />
            )}
            <Input
              label={t('username')}
              name={t('username')}
              placeholder={t('enter-your-name')}
              type="text"
              classNames={{
                inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                label: "text-gray-600"
              }}
              value={user}
              onChange={e => setUser(e.target.value?.trim())}
            />
            <Input
              endContent={
                <button type="button" onClick={() => setIsVisible(!isVisible)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {isVisible ? (
                    <Icon
                      className="pointer-events-none text-xl"
                      icon="ri-eye-off-line"
                    />
                  ) : (
                    <Icon
                      className="pointer-events-none text-xl"
                      icon="ri-eye-line"
                    />
                  )}
                </button>
              }
              label={t('password')}
              name="password"
              placeholder={t('enter-your-password')}
              type={isVisible ? "text" : "password"}
              classNames={{
                inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                label: "text-gray-600"
              }}
              value={password}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  login();
                }
              }}
              onChange={e => setPassword(e.target.value?.trim())}
            />
            <div className="flex items-center justify-between px-1">
              <Checkbox defaultSelected name="remember" size="sm" classNames={{ wrapper: "rounded-lg" }}>
                {t('keep-sign-in')}
              </Checkbox>
            </div>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
              radius="full"
              size="lg"
              isLoading={SignIn.loading.value}
              onPress={login}
            >
              {t('sign-in')}
            </Button>
          </form>
          {canRegister && (
            <p className="text-center text-small">
              {t('need-to-create-an-account')}&nbsp;
              <Link to="/signup">
                {t('sign-up')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </GradientBackground>
  );
}
