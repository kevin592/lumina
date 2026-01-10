import { observer } from "mobx-react-lite";
import { Alert, Button, Input, Switch, Tooltip, Image } from "@heroui/react";
import { RootStore } from "@/store";
import { UserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { DialogStore } from "@/store/module/Dialog";
import { UpdateUserInfo, UpdateUserPassword } from "../Common/UpdateUserInfo";
import { Item, SettingCard, SettingSectionTitle } from "./Item";
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
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { UploadFileWrapper } from "../Common/UploadFile";
import { signOut } from "../Auth/auth-client";
import { getluminaEndpoint } from "@/lib/luminaEndpoint";
import { AvatarSelector } from "../Common/AvatarSelector";

export const BasicSetting = observer(() => {
  const user = RootStore.Get(UserStore)
  const CODE = `curl -X 'POST' '${getluminaEndpoint() ?? window.location.origin}api/v1/note/upsert' \\\n      -H 'Content-Type: application/json' \\\n      -H 'Authorization: Bearer ${user.userInfo.value?.token}' \\\n      -d '{ "content": "🎉Hello,Lumina! --send from api ", "type":0 }'\n`
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
      {/* 头部区域 */}
      <div className="mb-6 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
          <i className="ri-settings-3-line text-xl"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">{t('basic-information')}</h2>
          <p className="text-sm text-default-500">管理你的个人资料和账户设置</p>
        </div>
      </div>

      {/* 第一组：个人资料与账户 */}
      <SettingSectionTitle title="个人资料" />
      <SettingCard className="mb-8">
        <Item
          title={t('name')}
          description="你的头像与昵称"
          rightContent={
            <div className="flex gap-3 items-center">
              {/* 头像 - 点击可更换 */}
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
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-violet-200 transition-all"
                      />
                    ) : (
                      <Image src="/logo.png" width={36} className="rounded-full" />
                    )}
                    <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <i className="ri-camera-fill text-white text-xs"></i>
                    </div>
                  </div>
                </UploadFileWrapper>
              </div>

              {/* 昵称 */}
              <div className="text-sm font-medium text-gray-900">{user.name}</div>

              <div className="w-[1px] h-3 bg-gray-300 mx-1"></div>

              {/* 编辑资料按钮 */}
              <Tooltip content={t('change-user-info')}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  className="text-gray-500 hover:text-violet-600"
                  onPress={() => {
                    RootStore.Get(DialogStore).setData({
                      isOpen: true,
                      title: t('change-user-info'),
                      content: <UpdateUserInfo />
                    })
                  }}
                >
                  <i className="ri-edit-line text-lg"></i>
                </Button>
              </Tooltip>

              {/* 修改密码 */}
              <Tooltip content={t('rest-user-password')}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  className="text-gray-500 hover:text-violet-600"
                  onPress={() => {
                    RootStore.Get(DialogStore).setData({
                      title: t('rest-user-password'),
                      isOpen: true,
                      content: <UpdateUserPassword />
                    })
                  }}
                >
                  <i className="ri-lock-password-line text-lg"></i>
                </Button>
              </Tooltip>

              {/* 绑定账号 (OAuth) */}
              {user.userInfo?.value?.loginType == 'oauth' && (
                <Tooltip content={t('link-account')}>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    radius="full"
                    className="text-gray-500 hover:text-violet-600"
                    onPress={() => {
                      RootStore.Get(DialogStore).setData({
                        title: t('link-account'),
                        isOpen: true,
                        size: 'md',
                        content: <LinkAccountModal />
                      })
                    }}
                  >
                    <i className="ri-link text-lg"></i>
                  </Button>
                </Tooltip>
              )}
            </div>
          }
        />

        <Item
          title={t('access-token')}
          description={
            <div className="flex items-center gap-1">
              <span>用于 API 访问</span>
              <span
                className="text-xs text-amber-500 hover:text-amber-600 cursor-pointer ml-2 flex items-center gap-0.5"
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
          }
          rightContent={
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Input
                  disabled
                  size="sm"
                  className="w-[240px]"
                  classNames={{
                    input: "text-right font-mono text-xs",
                    inputWrapper: "h-8 min-h-8 bg-gray-100/50"
                  }}
                  value={store.showToken ? user.userInfo.value?.token : '••••••••••••••••••••••'}
                  type={store.showToken ? "text" : "password"}
                  endContent={
                    <button
                      className="focus:outline-none ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => store.setShowToken(!store.showToken)}
                    >
                      <i className={store.showToken ? "ri-eye-off-line" : "ri-eye-line"}></i>
                    </button>
                  }
                />
              </div>

              <Button isIconOnly size="sm" variant="light" radius="full" onPress={() => copyToClipboard(user.userInfo.value?.token ?? '')}>
                <Copy size={16} content={user.userInfo.value?.token ?? ''} />
              </Button>

              <Tooltip content="Reset Token">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  radius="full"
                  className="text-gray-400 hover:text-red-500"
                  onPress={async () => {
                    await PromiseCall(api.users.regenToken.mutate())
                    user.userInfo.call(Number(user.id))
                  }}
                >
                  <i className="ri-refresh-line text-lg"></i>
                </Button>
              </Tooltip>
            </div>
          }
        />

        <AnimatePresence>
          {store.showToken && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-gray-50/50"
            >
              <div className="p-4 pt-0">
                <div className="relative">
                  <Copy size={18} content={CODE} className="absolute top-4 right-4 z-10" />
                  <MarkdownRender content={CODE_SNIPPET} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingCard>

      {/* 第二组：安全与设置 */}
      <SettingSectionTitle title="系统与安全" />
      <SettingCard>
        {user.role == 'superadmin' && (
          <Item
            title={t('allow-register')}
            description="允许新用户注册账号"
            rightContent={
              <Switch
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
            }
          />
        )}

        <Item
          title={t('two-factor-authentication')}
          description="启用两步验证以提高账户安全性"
          rightContent={
            <Switch
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
          }
        />

        <Item
          title={t('hide-pc-editor')}
          description="在桌面上隐藏编辑器侧边栏"
          rightContent={
            <Switch
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
          }
        />

        {user.role == 'superadmin' && (
          <Item
            title="Webhook"
            description="接收系统事件通知"
            rightContent={
              <Input
                size="sm"
                placeholder="https://..."
                value={store.webhookEndpoint}
                onChange={(e) => store.webhookEndpoint = e.target.value}
                onBlur={async () => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'webhookEndpoint',
                    value: store.webhookEndpoint
                  }))
                }}
                className="w-[200px]"
              />
            }
          />
        )}
      </SettingCard>

      {/* 危险区域 */}
      {user.userInfo?.value?.isLinked && (
        <div className="mt-8">
          <SettingSectionTitle title="危险区域" />
          <SettingCard className="border-red-100 bg-red-50/30">
            <Item
              title={
                <span className="text-red-600">{t('unlink-account')}</span>
              }
              description="解除第三方账号绑定"
              rightContent={
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
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
                  {t('unbind')}
                </Button>
              }
            />
          </SettingCard>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          variant="flat"
          color="danger"
          startContent={<i className="ri-logout-box-r-line"></i>}
          onPress={async () => {
            await signOut({ callbackUrl: '/signin' })
            eventBus.emit('user:signout')
          }}
        >
          {t('logout')}
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
    // You might want to show a toast here
  }
}
