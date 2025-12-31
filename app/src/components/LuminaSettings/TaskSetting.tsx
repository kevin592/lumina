import { observer } from "mobx-react-lite";
import {
  Input,
  Select,
  SelectItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Progress,
} from "@heroui/react";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { PromiseCall } from "@/store/standard/PromiseState";
import { helper } from "@/lib/helper";
import dayjs from "@/lib/dayjs";
import { Icon } from '@/components/Common/Iconify/icons';
import { api } from "@/lib/trpc";
import { Item } from "./Item";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { _ } from "@/lib/lodash";
import { CollapsibleCard } from "../Common/CollapsibleCard";

const UpdateDebounceCall = _.debounce((v) => {
  return PromiseCall(api.config.update.mutate({ key: 'autoArchivedDays', value: Number(v) }))
}, 500)

export const TaskSetting = observer(() => {
  const Lumina = RootStore.Get(LuminaStore)
  const [autoArchivedDays, setAutoArchivedDays] = useState("90")
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (Lumina.config.value?.autoArchivedDays) {
      setAutoArchivedDays(String(Lumina.config.value?.autoArchivedDays))
    }
  }, [Lumina.config.value?.autoArchivedDays])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (polling) {
      timer = setInterval(() => {
        Lumina.task.call();
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [polling]);

  const { t } = useTranslation()
  return (
    <CollapsibleCard
      icon="ri-time-line"
      title={t('schedule-task')}
    >
      <Item
        leftContent={<>{t('schedule-back-up')}</>}
        rightContent={
          <Switch
            thumbIcon={Lumina.updateDBTask.loading.value ? <Icon icon="ri:loader-4-line" width="24" height="24" className="animate-spin" /> : null}
            isDisabled={Lumina.updateDBTask.loading.value}
            isSelected={Lumina.DBTask?.isRunning}
            onChange={async e => {
              setPolling(true);
              await Lumina.updateDBTask.call(e.target.checked);
              setPolling(false);
            }}
          />} />
      <Item
        leftContent={<>{t('schedule-archive-Lumina')}</>}
        rightContent={
          <div className="flex gap-4">
            <Input
              value={autoArchivedDays}
              onChange={e => {
                setAutoArchivedDays(e.target.value)
                UpdateDebounceCall(e.target.value)
              }}
              className="w-[120px]"
              labelPlacement="outside"
              endContent={t('days')}
              type="number"
              min={1}
            />
            <Switch
              thumbIcon={Lumina.updateArchiveTask.loading.value ? <Icon icon="ri:loader-4-line" width="24" height="24" className="animate-spin" /> : null}
              isDisabled={Lumina.updateArchiveTask.loading.value}
              isSelected={Lumina.ArchiveTask?.isRunning}
              onChange={async e => {
                await Lumina.updateArchiveTask.call(e.target.checked)
              }}
            />
          </div>} />
      <TasksPanel />
    </CollapsibleCard>
  );
})

const TasksPanel = observer(() => {
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore)
  return <> {Lumina.task.value && <Table shadow="none" className="mb-2">
    <TableHeader>
      <TableColumn>{t('name-db')}</TableColumn>
      <TableColumn>{t('schedule')}</TableColumn>
      <TableColumn>{t('last-run')}</TableColumn>
      <TableColumn>{t('backup-file')}</TableColumn>
      <TableColumn>{t('status')}</TableColumn>
    </TableHeader>
    <TableBody>
      {
        Lumina.task.value!.filter(i => i.name != 'rebuildEmbedding').map(i => {
          const progress = i.output?.progress;
          return <TableRow>
            <TableCell>{i.name}</TableCell>
            <TableCell>
              <Select
                selectedKeys={[i.schedule]}
                onChange={async e => {
                  await PromiseCall(api.task.upsertTask.mutate({
                    time: e.target.value,
                    type: 'update',
                    task: i.name as any
                  }))
                  Lumina.task.call()
                }}
                size="sm"
                className="w-[200px]"
              >
                {helper.cron.cornTimeList.map((item) => (
                  <SelectItem key={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </Select>
            </TableCell>
            <TableCell>{dayjs(i?.lastRun).fromNow()}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {
                  i.output?.filePath && <>
                    {/* @ts-ignore  */}
                    {i.output?.filePath}
                    {/* @ts-ignore  */}
                    <Icon className='cursor-pointer' onClick={e => downloadFromLink(getluminaEndpoint(i?.output?.filePath))} icon="ri:download-line" width="24" height="24" />
                  </>
                }
                {progress && !i.output?.filePath && (
                  <div className="w-full max-w-[200px]">
                    <Progress
                      size="sm"
                      value={progress.percent}
                      color="primary"
                      className="max-w-md"
                      showValueLabel={true}
                    />
                    <div className="text-xs text-gray-500">
                      {`${(progress.processedBytes / (1024 * 1024)).toFixed(2)} MB`}
                    </div>
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className={`${i?.isRunning ? 'text-green-500' : 'text-red-500'} flex items-center `}>
                <Icon icon="ri:checkbox-blank-circle-fill" width="24" height="24" />
                <div className="min-w-[50px]">
                  {i?.isRunning ? (
                    progress ? `${t('running')}` : t('running')
                  ) : t('stopped')}
                </div>
              </div>
            </TableCell>
          </TableRow>
        })
      }
    </TableBody>
  </Table>
  } </>
})
