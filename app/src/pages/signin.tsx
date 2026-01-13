import React, { useEffect, useState } from "react";
import { Button, Input, Checkbox } from "@heroui/react";
import { Icon } from '@/components/Common/Iconify/icons';
import { RootStore } from "@/store";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { useTranslation } from "react-i18next";
import { StorageState } from "@/store/standard/StorageState";
import { UserStore } from "@/store/user";
import { PromiseState } from "@/store/standard/PromiseState";
import { api, reinitializeTrpcApi } from "@/lib/trpc";
import { signIn } from "@/components/Auth/auth-client";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loadingProvider, setLoadingProvider] = useState<string>('');
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    location.pathname === '/signup' ? 'signup' : 'signin'
  );

  useEffect(() => {
    if (location.pathname === '/signup') {
      setMode('signup');
    } else {
      setMode('signin');
    }
  }, [location.pathname]);


  // Register form states
  const [regUser, setRegUser] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regPassword2, setRegPassword2] = React.useState("");
  const [isRegVisible, setIsRegVisible] = React.useState(false);
  const [isRegConfirmVisible, setIsRegConfirmVisible] = React.useState(false);

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

  const handleRegister = async () => {
    if (!regUser || !regPassword || !regPassword2) {
      return RootStore.Get(ToastPlugin).error(t('required-items-cannot-be-empty'));
    }
    if (regPassword !== regPassword2) {
      return RootStore.Get(ToastPlugin).error(t('the-two-passwords-are-inconsistent'));
    }
    try {
      await api.users.register.mutate({ name: regUser, password: regPassword });
      RootStore.Get(ToastPlugin).success(t('create-successfully-is-about-to-jump-to-the-login'));
      setUser(regUser);
      setPassword(regPassword);
      setMode('signin');
    } catch (error: any) {
      return RootStore.Get(ToastPlugin).error(error.message || 'Registration failed');
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    // Navigate to the corresponding route
    navigate(newMode === 'signin' ? '/signin' : '/signup');

    // Clear registration fields when switching
    if (mode === 'signin') {
      setRegUser("");
      setRegPassword("");
      setRegPassword2("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F0F2F5] selection:bg-violet-200 selection:text-violet-900">
      {/* Refined Aurora Hero Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden aurora-hero">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-400/20 rounded-full blur-[100px] mix-blend-multiply opacity-60 animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[100px] mix-blend-multiply opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] right-[30%] w-[400px] h-[400px] bg-pink-300/20 rounded-full blur-[90px] mix-blend-multiply opacity-50 animate-blob animation-delay-4000" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[440px] relative z-10 perspective-1000 animate-slide-up">

        {/* Header Section */}
        <div className="text-center mb-10 group">
          <div className="inline-flex items-center justify-center w-[80px] h-[80px] rounded-[24px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-glow mb-6 transform transition-all duration-700 group-hover:scale-105 group-hover:rotate-3 border border-white/20 relative overflow-hidden">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"></div>
            <i className="fa-solid fa-bolt text-white text-3xl drop-shadow-md relative z-10"></i>
          </div>
          <h1 className="font-display font-bold text-4xl text-gray-900 mb-3 tracking-tight">
            {mode === 'signin' ? t('welcome-back') : t('join-lumina')}
          </h1>
          <p className="text-gray-500 text-[16px] font-medium leading-relaxed max-w-xs mx-auto">
            {mode === 'signin'
              ? t('welcome-back-desc')
              : t('join-lumina-desc')}
          </p>
        </div>

        {/* Auth Card - Premium Glass Panel */}
        <div className="bg-white/70 backdrop-blur-[50px] backdrop-saturate-150 border border-white/50 rounded-[32px] shadow-[0_8px_32px_rgba(31,38,135,0.07)] p-8 sm:p-10 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(31,38,135,0.1)] hover:bg-white/80">

          <div className="flex flex-col gap-6">
            {/* OAuth Providers (Sign In Only) */}
            {mode === 'signin' && providers.length > 0 && (
              <>
                <div className="flex flex-col gap-3">
                  {providers.map((provider) => (
                    <Button
                      key={provider.id}
                      className="h-[52px] bg-white border border-gray-100/80 text-gray-700 hover:bg-gray-50 hover:border-gray-200 shadow-sm hover:shadow transition-all rounded-2xl font-semibold text-[15px] tracking-wide group"
                      startContent={<Icon icon={provider.icon} className="text-xl text-gray-600 group-hover:scale-110 transition-transform" />}
                      isLoading={loadingProvider === provider.id}
                      onPress={() => {
                        setLoadingProvider(provider.id);
                        window.location.href = `${getluminaEndpoint()}api/auth/${provider.id}`;
                      }}
                    >
                      {t('continue-with', { provider: provider.name })}
                    </Button>
                  ))}
                </div>

                <div className="relative flex py-2 items-center text-gray-400">
                  <div className="flex-grow border-t border-gray-200/60"></div>
                  <span className="flex-shrink-0 mx-4 text-[11px] font-bold uppercase tracking-widest opacity-70">{t('or-credentials')}</span>
                  <div className="flex-grow border-t border-gray-200/60"></div>
                </div>
              </>
            )}

            {/* Form Fields */}
            {/* Server Endpoint (Tauri Only) - Always visible in Tauri env */}
            {isTauriEnv && mode === 'signin' && (
              <div className="group">
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('server-url')}</label>
                <Input
                  placeholder="https://your-server.com"
                  type="text"
                  classNames={{
                    inputWrapper: "h-[56px] bg-white/60 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-inner",
                    input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                  }}
                  value={endpoint.replace(/"/g, '')}
                  onChange={e => {
                    setEndpoint(e.target.value?.trim().replace(/"/g, ''))
                    endpointStorage.save(e.target.value?.trim().replace(/"/g, ''))
                  }}
                />
              </div>
            )}


            {mode === 'signin' ? (
              // SIGN IN FORM
              <>
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('username')}</label>
                    <Input
                      placeholder={t('enter-your-username')}
                      type="text"
                      classNames={{
                        inputWrapper: "h-[56px] bg-white/50 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-sm",
                        input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                        base: "opacity-100"
                      }}
                      value={user}
                      onChange={e => setUser(e.target.value?.trim())}
                    />
                  </div>

                  <div className="group">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('password')}</label>
                    <Input
                      placeholder={t('enter-your-password')}
                      endContent={
                        <button type="button" onClick={() => setIsVisible(!isVisible)} className="text-gray-400 hover:text-violet-600 transition-colors p-2 focus:outline-none rounded-lg hover:bg-violet-50">
                          <Icon className="text-xl" icon={isVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                        </button>
                      }
                      type={isVisible ? "text" : "password"}
                      classNames={{
                        inputWrapper: "h-[56px] bg-white/50 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-sm",
                        input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                        base: "opacity-100"
                      }}
                      value={password}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') login();
                      }}
                      onChange={e => setPassword(e.target.value?.trim())}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 mt-3">
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className="relative flex items-center justify-center w-[22px] h-[22px] rounded-[7px] border-2 border-gray-300 bg-white transition-all duration-200 group-hover:border-violet-400 peer-checked:bg-violet-600 peer-checked:border-violet-600 shadow-sm">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="peer absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      {/* Custom visual checkbox state linked to peer-checked */}
                      <div className="w-[22px] h-[22px] rounded-[7px] border-2 border-transparent bg-transparent transition-all duration-200 absolute top-[-2px] left-[-2px] pointer-events-none peer-checked:bg-violet-600 flex items-center justify-center">
                        <i className="fa-solid fa-check text-white text-[12px] opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all duration-200"></i>
                      </div>
                    </div>
                    <span className="text-gray-500 font-medium text-[14px] group-hover:text-violet-600 transition-colors">{t('keep-me-signed-in')}</span>
                  </label>
                </div>

                <Button
                  className="h-[56px] w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_35px_-10px_rgba(124,58,237,0.6)] hover:translate-y-[-1px] active:translate-y-[0px] active:scale-[0.98] transition-all rounded-2xl font-bold text-[16px] tracking-wide"
                  isLoading={SignIn.loading.value}
                  onPress={login}
                >
                  {t('sign-in')}
                </Button>
              </>
            ) : (
              // SIGN UP FORM
              <>
                <div className="space-y-4">
                  <div className="group">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('choose-username')}</label>
                    <Input
                      isRequired
                      placeholder="e.g. johndoe"
                      type="text"
                      classNames={{
                        inputWrapper: "h-[56px] bg-white/50 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-sm",
                        input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                      }}
                      value={regUser}
                      onChange={e => setRegUser(e.target.value?.trim())}
                    />
                  </div>

                  <div className="group">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('create-password')}</label>
                    <Input
                      isRequired
                      placeholder={t('enter-your-password')}
                      endContent={
                        <button type="button" onClick={() => setIsRegVisible(!isRegVisible)} className="text-gray-400 hover:text-violet-600 transition-colors p-2 focus:outline-none rounded-lg hover:bg-violet-50">
                          <Icon className="text-xl" icon={isRegVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                        </button>
                      }
                      type={isRegVisible ? "text" : "password"}
                      classNames={{
                        inputWrapper: "h-[56px] bg-white/50 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-sm",
                        input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                      }}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value?.trim())}
                    />
                  </div>

                  <div className="group">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('confirm-password')}</label>
                    <Input
                      isRequired
                      placeholder={t('confirm-password')}
                      endContent={
                        <button type="button" onClick={() => setIsRegConfirmVisible(!isRegConfirmVisible)} className="text-gray-400 hover:text-violet-600 transition-colors p-2 focus:outline-none rounded-lg hover:bg-violet-50">
                          <Icon className="text-xl" icon={isRegConfirmVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                        </button>
                      }
                      type={isRegConfirmVisible ? "text" : "password"}
                      classNames={{
                        inputWrapper: "h-[56px] bg-white/50 backdrop-blur-md border border-gray-200/50 hover:bg-white/80 focus-within:!bg-white focus-within:!border-violet-500/30 focus-within:!shadow-[0_0_0_4px_rgba(139,92,246,0.1)] rounded-2xl transition-all duration-300 shadow-sm",
                        input: "text-gray-900 text-[16px] placeholder:text-gray-400 font-medium",
                      }}
                      value={regPassword2}
                      onChange={e => setRegPassword2(e.target.value?.trim())}
                    />
                  </div>
                </div>

                <Button
                  className="h-[56px] w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_35px_-10px_rgba(124,58,237,0.6)] hover:translate-y-[-1px] active:translate-y-[0px] active:scale-[0.98] transition-all rounded-2xl font-bold text-[16px] tracking-wide"
                  onPress={handleRegister}
                >
                  {t('create-account')}
                </Button>
              </>
            )}


            {/* Toggle Mode */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-[14px] text-gray-500 font-medium">
                {mode === 'signin' ? t('dont-have-account-prefix') : t('already-have-account-prefix')}
                <button
                  onClick={toggleMode}
                  className="font-bold text-violet-600 hover:text-violet-700 transition-colors hover:underline focus:outline-none ml-1"
                >
                  {mode === 'signin' ? t('sign-up') : t('sign-in')}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-10 text-[12px] text-gray-400/80 font-medium">
          {t('protected-by-recaptcha')}
          <a href="#" className="hover:text-gray-600 transition-colors ml-1 border-b border-transparent hover:border-gray-400 pb-0.5">{t('privacy-policy')}</a> {t('and')}
          <a href="#" className="hover:text-gray-600 transition-colors ml-1 border-b border-transparent hover:border-gray-400 pb-0.5">{t('terms-of-service')}</a>.
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
            animation-delay: 4s;
        }
        .aurora-hero {
          background: radial-gradient(at 0% 0%, rgba(255, 255, 255, 0.5) 0px, transparent 50%),
                      radial-gradient(at 100% 100%, rgba(255, 255, 255, 0.5) 0px, transparent 50%);
          filter: blur(80px);
        }
      `}</style>
    </div>
  );
}

