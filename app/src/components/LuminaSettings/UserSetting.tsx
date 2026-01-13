import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { Item } from "./Item";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { UserStore } from "@/store/user";
import { PromiseCall, PromiseState } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { Button, Chip, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { useEffect } from "react";
import { DialogStore } from "@/store/module/Dialog";
import { PasswordInput } from "../Common/PasswordInput";
import { showTipsDialog } from "../Common/TipsDialog";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { glassTableStyles, glassButtonStyles } from "./glassStyles";
import { getluminaEndpoint } from "@/lib/luminaEndpoint";

const UpdateUserInfo = observer(({ id, name, password, nickname, loginType }: { id?: number, name: string, password: string, nickname?: string, loginType?: string }) => {
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore)
  const store = RootStore.Local(() => ({
    username: name,
    password,
    nickname: nickname || name,
    upsertUser: new PromiseState({
      function: async () => {
        const upsertItem: { name: string; password: string; nickname?: string; id?: number } = {
          name: store.username,
          password: store.password,
          nickname: store.nickname
        }
        if (id) upsertItem.id = id
        await PromiseCall(api.users.upsertUserByAdmin.mutate(upsertItem))
        RootStore.Get(DialogStore).close()
        Lumina.userList.call()
      }
    })
  }))

  const isOauth = loginType === 'oauth'

  return <>
    <Input
      label={t('username')}
      placeholder={t('username')}
      labelPlacement="outside"
      variant="bordered"
      value={store.username}
      onChange={e => { store.username = e.target.value }}
      isDisabled={isOauth}
    />
    <Input
      label={t('nickname')}
      placeholder={t('nickname')}
      labelPlacement="outside"
      variant="bordered"
      value={store.nickname}
      onChange={e => { store.nickname = e.target.value }}
      className="mt-2"
    />
    <PasswordInput placeholder={t('password')} label={t('password')} value={store.password} onChange={e => { store.password = e.target.value }} />
    <div className="flex w-full mt-2">
      <Button isLoading={store.upsertUser.loading.value} className="ml-auto" color='primary' onPress={async e => {
        await store.upsertUser.call()
      }}>{t('save')}</Button>
    </div>
  </>
})

export const UserSetting = observer(() => {
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore)
  const user = RootStore.Get(UserStore)

  useEffect(() => {
    Lumina.userList.call()
  }, [])

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 pb-4 flex justify-end">
        <Button
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-glow hover:bg-violet-700 transition-all flex items-center gap-2"
          onPress={e => {
            RootStore.Get(DialogStore).setData({
              isOpen: true,
              title: t('create-user'),
              content: <UpdateUserInfo name="" password="" />
            })
          }}
        >
          <i className="ri-add-line"></i> {t('create-user')}
        </Button>
      </div>

      <Table
        shadow="none"
        classNames={glassTableStyles}
        className="max-h-[400px] overflow-y-auto"
      >
        <TableHeader>
          <TableColumn className="text-xs font-bold text-gray-700 uppercase">{t('name-db')}</TableColumn>
          <TableColumn className="text-xs font-bold text-gray-700 uppercase">{t('nickname')}</TableColumn>
          <TableColumn className="text-xs font-bold text-gray-700 uppercase">{t('role')}</TableColumn>
          <TableColumn className="text-xs font-bold text-gray-700 uppercase">{t('login-type')}</TableColumn>
          <TableColumn className="text-xs font-bold text-gray-700 uppercase text-right">{t('action')}</TableColumn>
        </TableHeader>
        <TableBody>
          {
            Lumina.userList.value?.map((i) => {
              return (
                <TableRow key={i.id} className="hover:bg-white/40 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* 用户头像 */}
                      {i.image ? (
                        <img
                          src={getluminaEndpoint(`${i.image}?token=${user?.tokenData.value?.token}`)}
                          alt="avatar"
                          className="w-8 h-8 rounded-full border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                          <span className="text-violet-600 font-bold text-sm">
                            {i.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{i.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{i.nickname}</TableCell>
                  <TableCell>
                    {/* Violet badge for role */}
                    <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-0.5 rounded border border-violet-200">
                      {i.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      {i.loginType == 'oauth' ? (
                        <>
                          <i className="ri-github-fill"></i> OAuth
                        </>
                      ) : (
                        <>
                          <i className="ri-key-line"></i> {t('password')}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-gray-400 hover:text-violet-600 transition-colors"
                        onPress={(e: any) => {
                          e?.stopPropagation?.()
                          RootStore.Get(DialogStore).setData({
                            isOpen: true,
                            title: t('edit-user'),
                            content: <UpdateUserInfo id={i.id} name={i.name} password={i.password} nickname={i.nickname} loginType={i.loginType} />
                          })
                        }}
                      >
                        <i className="ri-edit-line text-lg"></i>
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onPress={(e: any) => {
                          e?.stopPropagation?.()
                          showTipsDialog({
                            size: 'sm',
                            title: t('confirm-to-delete'),
                            content: t('after-deletion-all-user-data-will-be-cleared-and-unrecoverable'),
                            onConfirm: async () => {
                              try {
                                await RootStore.Get(ToastPlugin).promise(
                                  api.users.deleteUser.mutate({ id: i.id }),
                                  {
                                    loading: t('in-progress'),
                                    success: <b>{t('your-changes-have-been-saved')}</b>,
                                    error: (e) => {
                                      return <b>{e.message}</b>
                                    },
                                  }
                                )
                                Lumina.userList.call()
                                RootStore.Get(DialogStandaloneStore).close()
                              } catch (e) {
                                RootStore.Get(DialogStandaloneStore).close()
                              }
                            }
                          })
                        }}
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          }
        </TableBody>
      </Table>
    </div >
  );
});
