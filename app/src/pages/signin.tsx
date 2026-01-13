import React, { useEffect, useState, useRef } from "react";
import { Button, Input, Checkbox } from "@heroui/react";
import { Icon } from '@/components/Common/Iconify/icons';
import { RootStore } from "@/store";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { useTranslation, Trans } from "react-i18next";
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

  // Phase 3: New States for Delight & Feedback
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Parallax Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        // Normalize mouse position from -1 to 1
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;

        // Smoothly update state using requestAnimationFrame is implicit in React state updates usually, 
        // but for high freq events, sometimes rAF is needed. 
        // Here we'll stick to simple state for simplicity as CSS transitions will handle smoothing.
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

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
          // Success Transition
          setIsSuccess(true);
          // Wait for animation before navigating
          setTimeout(() => {
            navigate('/');
          }, 800);
        }

        if (res?.error) {
          triggerShake();
          RootStore.Get(ToastPlugin).error(res.error);
        }

        return res;
      } catch (error) {
        console.error('SignIn error:', error);
        triggerShake();
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
      triggerShake();
      RootStore.Get(ToastPlugin).error(t('login-failed'));
    }
  };

  const handleRegister = async () => {
    if (!regUser || !regPassword || !regPassword2) {
      triggerShake();
      return RootStore.Get(ToastPlugin).error(t('required-items-cannot-be-empty'));
    }
    if (regPassword !== regPassword2) {
      triggerShake();
      return RootStore.Get(ToastPlugin).error(t('the-two-passwords-are-inconsistent'));
    }
    try {
      await api.users.register.mutate({ name: regUser, password: regPassword });
      RootStore.Get(ToastPlugin).success(t('create-successfully-is-about-to-jump-to-the-login'));
      setUser(regUser);
      setPassword(regPassword);
      setMode('signin');
    } catch (error: any) {
      triggerShake();
      return RootStore.Get(ToastPlugin).error(error.message || 'Registration failed');
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    navigate(newMode === 'signin' ? '/signin' : '/signup');
    if (mode === 'signin') {
      setRegUser("");
      setRegPassword("");
      setRegPassword2("");
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex bg-[#FDFDFD] selection:bg-indigo-100 selection:text-indigo-900 font-sans relative overflow-hidden">

      {/* 
        LEFT SIDE: Art & Brand with Parallax 
      */}
      <div className="hidden lg:flex w-[45%] lg:w-[48%] relative overflow-hidden bg-black items-center justify-center z-10 transition-all duration-300 ease-out">
        {/* Dynamic Mesh Gradient Background with Parallax */}
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-600/40 rounded-full blur-[120px] animate-mesh-flow mix-blend-screen transition-transform duration-100 ease-out"
            style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px) scale(1)` }}
          />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-violet-600/30 rounded-full blur-[100px] animate-mesh-flow animation-delay-2000 mix-blend-screen transition-transform duration-100 ease-out"
            style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px) scale(1)` }}
          />
          <div className="absolute top-[30%] left-[40%] w-[50%] h-[50%] bg-fuchsia-500/20 rounded-full blur-[80px] animate-mesh-flow animation-delay-4000 mix-blend-screen transition-transform duration-100 ease-out"
            style={{ transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px) scale(1)` }}
          />
        </div>

        {/* Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        {/* Brand Content - Staggered Entry */}
        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-8 shadow-2xl animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <i className="fa-solid fa-bolt text-3xl text-white"></i>
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight mb-6 tracking-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {t('hero.title')}
          </h1>
          <p className="text-lg text-white/60 font-medium leading-relaxed max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {t('hero.description')}
          </p>

          {/* Testimonial / Credibility (Optional) */}
          <div className="mt-12 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-600/50 backdrop-blur flex items-center justify-center text-xs font-bold text-white/80 transition-transform hover:-translate-y-1 hover:scale-110 hover:z-10 cursor-pointer duration-300">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="text-sm font-medium text-white/50">
              <Trans i18nKey="hero.social-proof" count="10,000">
                Trusted by <span className="text-white">10,000+</span> thinkers
              </Trans>
            </div>
          </div>
        </div>
      </div>


      {/* 
        RIGHT SIDE: Form
      */}
      <div className={`flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 relative bg-[#FDFDFD] transition-transform duration-700 ${isSuccess ? 'translate-x-full opacity-0' : ''}`}>

        {/* Success Overlay Animation - Morphing Button Extension */}
        {isSuccess && (
          <div className="fixed inset-0 z-50 bg-emerald-500 flex items-center justify-center animate-fill-screen origin-center pointer-events-none">
          </div>
        )}

        {/* Mobile Header */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50/50 to-transparent -z-10" />

        <div className={`w-full max-w-[400px] ${shake ? 'animate-shake' : ''}`}>

          <div className="mb-10 text-center lg:text-left">
            <div className="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-6 shadow-lg shadow-indigo-600/20 animate-fade-in-up">
              <i className="fa-solid fa-bolt text-xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {mode === 'signin' ? t('welcome-back') : t('create-account')}
            </h2>
            <p className="text-gray-500 font-medium animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              {mode === 'signin' ? t('welcome-back-desc') : t('join-lumina-desc')}
            </p>
          </div>

          <div className="space-y-6">
            {/* OAuth Providers */}
            {mode === 'signin' && providers.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="grid grid-cols-1 gap-3">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setLoadingProvider(provider.id);
                        window.location.href = `${getluminaEndpoint()}api/auth/${provider.id}`;
                      }}
                      className="group relative flex items-center justify-center gap-3 w-full h-[54px] bg-white border border-gray-200 rounded-2xl text-gray-700 font-semibold text-[15px] hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-100 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden transform hover:-translate-y-0.5 active:translate-y-0 duration-200"
                      disabled={!!loadingProvider}
                    >
                      {loadingProvider === provider.id ? (
                        <span className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          {provider.icon && <Icon icon={provider.icon} className="text-xl transition-transform group-hover:scale-110" />}
                          <span>{t('continue-with', { provider: provider.name })}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>

                <div className="relative flex py-2 items-center mt-6">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('or-credentials')}</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>
              </div>
            )}

            {/* Form Areas using Clean Styled Components */}
            {isTauriEnv && mode === 'signin' && (
              <div className="space-y-1.5 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <label className="text-sm font-semibold text-gray-700 ml-1">{t('server-url')}</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder={t('placeholder.server-url')}
                    className="w-full h-[52px] px-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm group-hover:bg-white"
                    value={endpoint.replace(/"/g, '')}
                    onChange={e => {
                      setEndpoint(e.target.value?.trim().replace(/"/g, ''))
                      endpointStorage.save(e.target.value?.trim().replace(/"/g, ''))
                    }}
                  />
                  {/* Validation Dot */}
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${endpoint.length > 0 ? 'bg-emerald-500 scale-100' : 'bg-gray-200 scale-0'}`} />
                </div>
              </div>
            )}

            {mode === 'signin' ? (
              // --- SIGN IN FORM ---
              <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>

                {/* Smart Input: Username */}
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-gray-700 ml-1 group-focus-within:text-indigo-600 transition-colors">{t('username')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enter-your-username')}
                      className="w-full h-[52px] px-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:bg-white"
                      value={user}
                      onChange={e => setUser(e.target.value?.trim())}
                    />
                    {/* Validation Dot */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${user.length > 0 ? 'bg-emerald-500 scale-100' : 'bg-gray-200 scale-0'}`} />
                  </div>
                </div>

                {/* Smart Input: Password */}
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-gray-700 ml-1 group-focus-within:text-indigo-600 transition-colors">{t('password')}</label>
                  <div className="relative">
                    <input
                      type={isVisible ? "text" : "password"}
                      placeholder={t('enter-your-password')}
                      className="w-full h-[52px] px-4 pr-12 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:bg-white"
                      value={password}
                      onKeyDown={(e) => e.key === 'Enter' && login()}
                      onChange={e => setPassword(e.target.value?.trim())}
                    />
                    <button
                      type="button"
                      onClick={() => setIsVisible(!isVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors"
                    >
                      <Icon className="text-lg" icon={isVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <div className="relative flex items-center justify-center w-5 h-5 rounded-md border-2 border-gray-300 bg-white transition-all group-hover:border-indigo-500 peer-checked:bg-indigo-600 peer-checked:border-indigo-600">
                      <input type="checkbox" defaultChecked className="peer absolute opacity-0 w-full h-full cursor-pointer" />
                      <div className="w-5 h-5 rounded-md bg-indigo-600 absolute inset-0 opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="fa-solid fa-check text-white text-[10px]"></i>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">{t('keep-me-signed-in')}</span>
                  </label>

                  <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors hover:underline">
                    {t('forgot-password')}?
                  </a>
                </div>

                {/* Magnetic & Morphing Button */}
                <div className="relative h-[60px] flex justify-center items-center mt-6">
                  <Button
                    onPress={login}
                    disabled={SignIn.loading.value || isSuccess}
                    className={`
                           relative overflow-hidden transition-all duration-500 ease-out font-bold text-[16px] tracking-wide shadow-lg
                           ${isSuccess
                        ? 'w-[60px] h-[60px] rounded-full bg-emerald-500 shadow-emerald-500/30'
                        : SignIn.loading.value
                          ? 'w-[60px] h-[60px] rounded-full bg-gray-900 shadow-gray-900/20 cursor-wait'
                          : 'w-full h-[60px] rounded-2xl bg-gray-900 text-white shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02]'
                      }
                        `}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isSuccess ? (
                        <i className="fa-solid fa-check text-white text-2xl animate-bounce-in"></i>
                      ) : SignIn.loading.value ? (
                        <span className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          {t('sign-in')}
                          <i className="fa-solid fa-arrow-right text-sm opacity-60 group-hover:translate-x-1 transition-transform"></i>
                        </span>
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              // --- SIGN UP FORM ---
              <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>

                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-gray-700 ml-1 group-focus-within:text-indigo-600 transition-colors">{t('choose-username')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('placeholder.username-example')}
                      className="w-full h-[52px] px-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:bg-white"
                      value={regUser}
                      onChange={e => setRegUser(e.target.value?.trim())}
                    />
                    {/* Validation Dot */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${regUser.length > 0 ? 'bg-emerald-500 scale-100' : 'bg-gray-200 scale-0'}`} />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-gray-700 ml-1 group-focus-within:text-indigo-600 transition-colors">{t('create-password')}</label>
                  <div className="relative">
                    <input
                      type={isRegVisible ? "text" : "password"}
                      placeholder={t('enter-your-password')}
                      className="w-full h-[52px] px-4 pr-12 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:bg-white"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value?.trim())}
                    />
                    <button
                      type="button"
                      onClick={() => setIsRegVisible(!isRegVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors"
                    >
                      <Icon className="text-lg" icon={isRegVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-gray-700 ml-1 group-focus-within:text-indigo-600 transition-colors">{t('confirm-password')}</label>
                  <div className="relative">
                    <input
                      type={isRegConfirmVisible ? "text" : "password"}
                      placeholder={t('confirm-password')}
                      className="w-full h-[52px] px-4 pr-12 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:bg-white"
                      value={regPassword2}
                      onChange={e => setRegPassword2(e.target.value?.trim())}
                    />
                    <button
                      type="button"
                      onClick={() => setIsRegConfirmVisible(!isRegConfirmVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors"
                    >
                      <Icon className="text-lg" icon={isRegConfirmVisible ? "ri-eye-off-line" : "ri-eye-line"} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  className="w-full h-[56px] mt-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-[16px] tracking-wide shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all relative overflow-hidden group"
                >
                  <span>{t('create-account')}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </button>
              </div>
            )}
          </div>

          {/* Switch Mode */}
          <div className="mt-10 text-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <p className="text-gray-500 font-medium text-[15px]">
              {mode === 'signin' ? t('dont-have-account-prefix') : t('already-have-account-prefix')}
              <button
                onClick={toggleMode}
                className="ml-1.5 font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
              >
                {mode === 'signin' ? t('sign-up') : t('sign-in')}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
         @keyframes mesh-flow {
           0% { transform: translate(0,0) scale(1); }
           50% { transform: translate(30px, -50px) scale(1.2); }
           100% { transform: translate(0,0) scale(1); }
         }
         .animate-mesh-flow {
           animation: mesh-flow 15s infinite alternate ease-in-out;
         }
         @keyframes shimmer {
           100% { transform: translateX(100%); }
         }
         .animate-shimmer {
           animation: shimmer 1.5s infinite;
         }
         @keyframes fade-in-up {
           from { opacity: 0; transform: translateY(20px); }
           to { opacity: 1; transform: translateY(0); }
         }
         .animate-fade-in-up {
           animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
           opacity: 0;
         }
         @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
         }
         .animate-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
         }
         @keyframes fill-screen {
            0% { clip-path: circle(0% at 50% 50%); }
            100% { clip-path: circle(150% at 50% 50%); }
         }
         .animate-fill-screen {
            animation: fill-screen 0.8s cubic-bezier(0.86, 0, 0.07, 1) forwards;
         }
         @keyframes bounce-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
         }
         .animate-bounce-in {
            animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
         }
      `}</style>
    </div>
  );
}
