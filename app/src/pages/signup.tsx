import React from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from '@/components/Common/Iconify/icons';
import { RootStore } from "@/store/root";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/trpc";
import { GradientBackground } from "@/components/Common/GradientBackground";
import { Link, useNavigate } from "react-router-dom";
export default function Component() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = React.useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const [user, setUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <GradientBackground>
      <div className="flex h-full w-screen items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="flex w-full max-w-sm flex-col gap-4 glass-panel px-8 pb-10 pt-6">
          <p className="pb-4 text-left text-3xl font-semibold text-gray-900">
            {t('sign-up')}
            <span aria-label="emoji" className="ml-2" role="img">
              👋
            </span>
          </p>
          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            <Input
              isRequired
              label={t('username')}
              labelPlacement="outside"
              name="username"
              placeholder={t('enter-your-username')}
              type="text"
              classNames={{
                inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                label: "text-gray-600 font-medium",
                mainWrapper: "group"
              }}
              value={user}
              onChange={e => setUser(e.target.value)}
            />
            <Input
              isRequired
              endContent={
                <button type="button" onClick={toggleVisibility} className="text-gray-400 hover:text-gray-600 transition-colors">
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
              labelPlacement="outside"
              name="password"
              placeholder={t('enter-your-password')}
              type={isVisible ? "text" : "password"}
              classNames={{
                inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                label: "text-gray-600 font-medium",
                mainWrapper: "group"
              }}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Input
              isRequired
              endContent={
                <button type="button" onClick={toggleConfirmVisibility} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {isConfirmVisible ? (
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
              label={t('confirm-password')}
              labelPlacement="outside"
              name="confirmPassword"
              placeholder={t('confirm-your-password')}
              type={isConfirmVisible ? "text" : "password"}
              classNames={{
                inputWrapper: "glass-input shadow-none hover:bg-white/60 transition-colors h-12 px-4 !rounded-xl",
                label: "text-gray-600 font-medium",
                mainWrapper: "group"
              }}
              value={password2}
              onChange={e => setPassword2(e.target.value)}
            />
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 mt-2"
              radius="full"
              size="lg"
              type="submit"
              onPress={async e => {
                if (!user || !password || !password2) {
                  return RootStore.Get(ToastPlugin).error(t('required-items-cannot-be-empty'))
                }
                if (password != password2) {
                  return RootStore.Get(ToastPlugin).error(t('the-two-passwords-are-inconsistent'))
                }
                try {
                  await api.users.register.mutate({ name: user, password })
                  RootStore.Get(ToastPlugin).success(t('create-successfully-is-about-to-jump-to-the-login'))
                  setTimeout(() => {
                    navigate('/signin')
                  }, 1000)
                } catch (error) {
                  return RootStore.Get(ToastPlugin).error(error.message)
                }
              }}>
              {t('sign-up')}
            </Button>
          </form>
          <p className="text-center text-small">
            <Link to="/signin">
              {t('already-have-an-account-direct-login')}
            </Link>
          </p>
        </div>
      </div>
    </GradientBackground>
  );
}
