import { observer } from "mobx-react-lite";
import { Alert, Button, Input, Switch, Tooltip, Image } from "@heroui/react";
import { RootStore } from "@/store";
import { UserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { UpdateUserInfo, UpdateUserPassword } from "../Common/UpdateUserInfo";
import { Copy } from "../Common/Copy";
import { MarkdownRender } from "../Common/MarkdownRender";
import { PromiseCall, PromiseState } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { LuminaStore } from "@/store/luminaStore";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShowGen2FATokenModal } from "../Common/TwoFactorModal/gen2FATokenModal";
import { eventBus } from "@/lib/event";
import { LinkAccountModal } from "../Common/Modals/LinkAccountModal";
import { showTipsDialog } from "../Common/TipsDialog";
import { UploadFileWrapper } from "../Common/UploadFile";
import { signOut } from "../Auth/auth-client";
import { getluminaEndpoint } from "@/lib/luminaEndpoint";
import { AvatarSelector } from "../Common/AvatarSelector";
import { glassInputStyles, glassButtonStyles } from "./glassStyles";

export const BasicSetting = observer(() => {
  const user = RootStore.Get(UserStore)
  const CODE = `curl -X 'POST' '${getluminaEndpoint() ?? window.location.origin}api/v1/note/upsert' \\\n      -H 'Content-Type: application/json' \\\n      -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\\n      -d '{ "content": "🎉Hello,Lumina! --send from api ", "type":0 }'\n`
  const CODE_SNIPPET = `\`\`\`javascript\n //Lumina api document:${getluminaEndpoint() ?? window.location.origin}/api-doc\n ${CODE} \`\`\``
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore)

  const store = RootStore.Local(() => ({
    webhookEndpoint: '',
    totpToken: '',
    showToken: false,
    showQRCode: false,
    totpSecret: '',
    qrCodeUrl: '',
    showLowPermToken: false,
    lowPermToken: '',
    showAvatarSelector: false,
    setShowToken(value: boolean) {
      this.showToken = value;
    },
    setShowQRCode(value: boolean) {
      this.showQRCode = value;
    },
    setTotpSecret(value: string) {
      this.totpSecret = value;
    },
    setQrCodeUrl(value: string) {
      this.qrCodeUrl = value;
    },
    setShowLowPermToken(value: boolean) {
      this.showLowPermToken = value;
    },
    setLowPermToken(value: string) {
      this.lowPermToken = value;
    },
    setShowAvatarSelector(value: boolean) {
      this.showAvatarSelector = value;
    },
    selectAvatar: new PromiseState({
      function: async (avatarPath) => {
        if (!user.userInfo.value?.id) return;
        await PromiseCall(api.users.upsertUser.mutate({
          id: user.userInfo.value?.id,
          image: avatarPath
        }));
        await user.userInfo.call(Number(user.id));
        await signOut({ callbackUrl: '/signin' });
        eventBus.emit('user:signout');
      }
    }),
    setRigster: new PromiseState({
      function: async (value: boolean) => {
        return await PromiseCall(api.config.update.mutate({
          key: 'isAllowRegister',
          value
        }))
      }
    }),
    genLowPermToken: new PromiseState({
      function: async () => {
        const response = await PromiseCall(api.users.genLowPermToken.mutate());
        return response;
      }
    }),
  }))

  useEffect(() => {
    store.webhookEndpoint = Lumina.config.value?.webhookEndpoint ?? ''
  }, [Lumina.config.value])

  return (
    <>
      {/* Profile Card - 按照原型设计 */}
      <div className="glass-card p-6 mb-8 flex flex-col items-center sm:flex-row sm:items-start gap-6">
        {/* 头像 - 大圆形 hover 显示编辑图标 */}
        <div className="relative group cursor-pointer" onClick={() => store.setShowAvatarSelector(true)}>
          <UploadFileWrapper
            acceptImage
            onUpload={async ({ filePath }) => {
              if (!user.userInfo.value?.id) return
              await PromiseCall(api.users.upsertUser.mutate({
                id: user.userInfo.value?.id,
                image: filePath
              }));
              await user.userInfo.call(Number(user.id))
              await signOut({ callbackUrl: '/signin' })
              eventBus.emit('user:signout')
            }}
          >
            <div className="relative">
              {user.userInfo.value?.image ? (
                <img
                  src={getluminaEndpoint(`${user.userInfo.value.image}?token=${user.tokenData.value?.token}`)}
                  alt="avatar"
                  className="w-20 h-20 rounded-full bg-white shadow-md border-2 border-white"
                />
              ) : (
                <Image src="/logo.png" width={80} className="rounded-full" />
              )}
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="ri-edit-line text-white text-lg"></i>
              </div>
            </div>
          </UploadFileWrapper>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 w-full space-y-4">
          {/* 两个输入框并排 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('nickname')}</label>
              <Input
                type="text"
                value={user.name || ''}
                isReadOnly
                classNames={glassInputStyles}
                className="w-full"
                size="sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('email')}</label>
              <Input
                type="email"
                value={user.userInfo.value?.name || ''}
                isDisabled
                classNames={{
                  ...glassInputStyles,
                  inputWrapper: "bg-gray-50/50 border border-transparent"
                }}
                className="w-full"
                size="sm"
              />
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={t('change-user-info')}>
              <Button
                className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                onPress={() => {
                  RootStore.Get(DialogStandaloneStore).setData({
                    isOpen: true,
                    title: t('change-user-info'),
                    content: <UpdateUserInfo />
                  })
                }}
              >
                <i className="ri-edit-line mr-1"></i> {t('edit-profile')}
              </Button>
            </Tooltip>

            <Tooltip content={t('rest-user-password')}>
              <Button
                className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                onPress={() => {
                  RootStore.Get(DialogStandaloneStore).setData({
                    title: t('rest-user-password'),
                    isOpen: true,
                    content: <UpdateUserPassword />
                  })
                }}
              >
                <i className="ri-lock-password-line mr-1"></i> {t('change-password')}
              </Button>
            </Tooltip>

            {user.userInfo?.value?.loginType == 'oauth' && (
              <Tooltip content={t('link-account')}>
                <Button
                  className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                  onPress={() => {
                    RootStore.Get(DialogStandaloneStore).setData({
                      title: t('link-account'),
                      isOpen: true,
                      size: 'md',
                      content: <LinkAccountModal />
                    })
                  }}
                >
                  <i className="ri-link mr-1"></i> {t('link-account')}
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Token Card - 横向布局 */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-bold text-lg text-gray-800 mb-1">{t('access-token')}</h3>
        <p className="text-sm text-gray-500 mb-4">用于 API 访问</p>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 flex items-center px-4 font-mono text-sm text-gray-600 select-all">
            {store.showToken ? user.userInfo.value?.token : '••••••••••••••••••••••'}
          </div>
          <button
            onClick={() => store.setShowToken(!store.showToken)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/80 text-gray-600 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
            title={store.showToken ? "Hide" : "Show"}
          >
            <i className={store.showToken ? "ri-eye-off-line" : "ri-eye-line"}></i>
          </button>
          <Button
            isIconOnly
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/80 text-gray-600 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
            onPress={() => copyToClipboard(user.userInfo.value?.token ?? '')}
          >
            <Copy size={16} content={user.userInfo.value?.token ?? ''} />
          </Button>
          <Tooltip content="Reset Token">
            <Button
              isIconOnly
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/80 text-gray-600 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
              onPress={async () => {
                await PromiseCall(api.users.regenToken.mutate())
                user.userInfo.call(Number(user.id))
              }}
            >
              <i className="ri-refresh-line"></i>
            </Button>
          </Tooltip>
        </div>

        {/* 低权限令牌入口 */}
        <div className="mt-3">
          <span
            className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer flex items-center gap-1"
            onClick={async () => {
              const response = await store.genLowPermToken.call();
              if (response?.token) {
                RootStore.Get(DialogStore).setData({
                  isOpen: true,
                  title: t('generate-low-permission-token'),
                  content: (
                    <div className="flex flex-col gap-4">
                      <Alert
                        color="warning"
                        description={t('low-permission-token-desc')}
                        title={t('this-token-is-only-displayed-once-please-save-it-properly')}
                        variant="faded"
                      />
                      <Input
                        readOnly
                        className="w-full"
                        value={response.token}
                        endContent={<Copy size={20} content={response.token} />}
                      />
                    </div>
                  )
                });
              }
            }}
          >
            <i className="ri-shield-keyhole-line"></i>
            {t('generate-low-permission-token')}
          </span>
        </div>
      </div>

      {/* 代码片段展开 */}
      <AnimatePresence>
        {store.showToken && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-gray-50/50 mb-8"
          >
            <div className="p-4">
              <div className="relative">
                <Copy size={18} content={CODE} className="absolute top-4 right-4 z-10" />
                <MarkdownRender content={CODE_SNIPPET} />
              </div>
              {/* 安全提示 */}
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <i className="ri-shield-keyhole-line text-amber-600 mt-0.5 flex-shrink-0"></i>
                <p className="text-xs text-amber-800">
                  <strong>安全提示：</strong>请将 <code className="px-1 py-0.5 bg-amber-100 rounded text-amber-900">YOUR_TOKEN_HERE</code> 替换为您的实际访问令牌。
                  您的令牌可在上方"显示令牌"按钮中查看。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Toggles - 分隔线布局 */}
      <div className="glass-card divide-y divide-gray-100/50 mb-8">
        {user.role == 'superadmin' && (
          <div className="p-5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('allow-register')}</h4>
              <p className="text-xs text-gray-500 mt-0.5">允许新用户注册账号</p>
            </div>
            <Switch
              name="allowRegister"
              size="sm"
              isDisabled={store.setRigster.loading.value}
              isSelected={user.canRegister.value}
              onChange={async e => {
                await store.setRigster.call(e.target.checked)
                user.canRegister.call()
              }}
              classNames={{
                wrapper: "group-data-[selected=true]:bg-violet-600",
                thumb: "group-data-[selected=true]:bg-white",
              }}
            />
          </div>
        )}

        <div className="p-5 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">{t('two-factor-authentication')}</h4>
            <p className="text-xs text-gray-500 mt-0.5">启用两步验证以提高账户安全性</p>
          </div>
          <Switch
            name="twoFactorEnabled"
            size="sm"
            isSelected={Lumina.config.value?.twoFactorEnabled ?? false}
            onChange={async (e) => {
              if (!e.target.checked) {
                await PromiseCall(api.config.update.mutate({
                  key: 'twoFactorEnabled',
                  value: false
                }));
                Lumina.config.call();
              } else {
                const response = await PromiseCall(api.users.generate2FASecret.mutate({
                  name: user.name!
                }), { autoAlert: false });
                if (response) {
                  ShowGen2FATokenModal({
                    qrCodeUrl: response.qrCode,
                    totpSecret: response.secret
                  })
                }
              }
            }}
            classNames={{
              wrapper: "group-data-[selected=true]:bg-violet-600",
              thumb: "group-data-[selected=true]:bg-white",
            }}
          />
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">{t('hide-pc-editor')}</h4>
            <p className="text-xs text-gray-500 mt-0.5">在桌面上隐藏编辑器侧边栏</p>
          </div>
          <Switch
            name="hidePcEditor"
            size="sm"
            isSelected={Lumina.config.value?.hidePcEditor ?? false}
            onChange={async (e) => {
              await PromiseCall(api.config.update.mutate({
                key: 'hidePcEditor',
                value: e.target.checked
              }));
              Lumina.config.call();
            }}
            classNames={{
              wrapper: "group-data-[selected=true]:bg-violet-600",
              thumb: "group-data-[selected=true]:bg-white",
            }}
          />
        </div>
      </div>

      {/* Webhook - 独立卡片 */}
      {user.role == 'superadmin' && (
        <div className="glass-card p-6 mb-8">
          <h3 className="font-bold text-lg text-gray-800 mb-4">Webhook</h3>
          <Input
            placeholder="https://..."
            classNames={glassInputStyles}
            value={store.webhookEndpoint}
            onChange={(e) => store.webhookEndpoint = e.target.value}
            onBlur={async () => {
              await PromiseCall(api.config.update.mutate({
                key: 'webhookEndpoint',
                value: store.webhookEndpoint
              }))
            }}
          />
        </div>
      )}

      {/* 危险区域 */}
      {user.userInfo?.value?.isLinked && (
        <div className="flex justify-end pt-4 mb-8">
          <Button
            className="px-5 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-red-200/80 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors"
            onPress={() => {
              showTipsDialog({
                title: t('unlink-account'),
                content: t('unlink-account-tips'),
                onConfirm: async () => {
                  await PromiseCall(api.users.unlinkAccount.mutate({
                    id: user.userInfo.value!.id
                  }))
                  eventBus.emit('user:signout')
                  RootStore.Get(DialogStandaloneStore).close()
                }
              })
            }}
          >
            {t('unlink-account')}
          </Button>
        </div>
      )}

      {/* 注销按钮 */}
      <div className="flex justify-end">
        <Button
          className="px-5 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-red-200/80 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors"
          onPress={async () => {
            await signOut({ callbackUrl: '/signin' })
            eventBus.emit('user:signout')
          }}
        >
          <i className="ri-logout-box-r-line mr-1"></i> {t('logout')}
        </Button>
      </div>

      <AvatarSelector
        isOpen={store.showAvatarSelector}
        onClose={() => store.setShowAvatarSelector(false)}
        onSelect={async (avatarPath) => {
          await store.selectAvatar.call(avatarPath);
        }}
        currentAvatar={user.userInfo.value?.image}
      />
    </>
  );
})

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}
