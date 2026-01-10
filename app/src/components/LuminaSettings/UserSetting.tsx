import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { Item } from "./Item";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { PromiseCall, PromiseState } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { Button, Chip, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { useEffect } from "react";
import { DialogStore } from "@/store/module/Dialog";
import { PasswordInput } from "../Common/PasswordInput";
import { showTipsDialog } from "../Common/TipsDialog";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";

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
  useEffect(() => {
    Lumina.userList.call()
  }, [])

  return (
    <div className="glass-card p-6 mb-6">
      {/* 卡片头部 - Fortent V6.5 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <i className="ri-user-settings-line"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">{t('user-list')}</h2>
          <p className="text-sm text-default-500">管理设置</p>
        </div>
      </div>

      {/* 设置项内容 */}
      <div className="space-y-4">
      <Item
        leftContent={<>{t('user-list')}</>}
        rightContent={
          <Button size="sm" color="primary" startContent={<i className="ri-user-add-line text-lg"></i>}
            onPress={e => {
              RootStore.Get(DialogStore).setData({
                isOpen: true,
                title: t('create-user'),
                content: <UpdateUserInfo name="" password="" />
              })
            }}>{t('create-user')}</Button>
        }
      />

      <Item
        leftContent={Lumina.userList.value ? <Table shadow="none" className="mb-2 max-h-[300px] overflow-y-auto">
          <TableHeader>
            <TableColumn>{t('name-db')}</TableColumn>
            <TableColumn>{t('nickname')}</TableColumn>
            <TableColumn>{t('role')}</TableColumn>
            <TableColumn>{t('login-type')}</TableColumn>
            <TableColumn>{t('action')}</TableColumn>
          </TableHeader>
          <TableBody>
            {
              Lumina.userList.value!.map(i => {
                return <TableRow>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.nickname}</TableCell>
                  <TableCell>
                    <Chip size="sm" color="warning" variant="bordered">{i.role}</Chip>
                  </TableCell>
                  <TableCell>{i.loginType == 'oauth' ? 'oauth' : t('password')}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button isIconOnly variant="flat" size="sm" startContent={<i className="ri-edit-line text-lg"></i>} onPress={e => {
                        RootStore.Get(DialogStore).setData({
                          isOpen: true,
                          title: t('edit-user'),
                          content: <UpdateUserInfo id={i.id} name={i.name} password={i.password} nickname={i.nickname} loginType={i.loginType} />
                        })
                      }}>
                      </Button>
                      <Button isIconOnly color="danger" size="sm" className="ml-2"
                        startContent={<i className="ri-delete-bin-line text-lg"></i>}
                        onPress={e => {
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
                                  })
                                Lumina.userList.call()
                                RootStore.Get(DialogStandaloneStore).close()
                              } catch (e) {
                                // RootStore.Get(ToastPlugin).error(e.message)
                                RootStore.Get(DialogStandaloneStore).close()
                              }
                            }
                          })
                        }}>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              })
            }
          </TableBody>
        </Table > : null
        }
      />
      </div>
    </div >
  );
});