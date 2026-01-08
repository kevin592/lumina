import React, { useEffect } from 'react'
import { observer } from "mobx-react-lite"
import { RootStore } from "@/store/root"
import { AnalyticsStore } from "@/store/analyticsStore"
import { useTranslation } from "react-i18next"
import { HeatMap } from "@/components/LuminaAnalytics/HeatMap"
import { StatsCards } from "@/components/LuminaAnalytics/StatsCards"
import { TagDistributionChart } from "@/components/LuminaAnalytics/TagDistributionChart"
import dayjs from "dayjs"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react"
import { Icon } from '@/components/Common/Iconify/icons'
import { ScrollArea } from '@/components/Common/ScrollArea'

const Analytics = observer(() => {
  const analyticsStore = RootStore.Get(AnalyticsStore)
  const { t } = useTranslation()
  const [selectedMonth, setSelectedMonth] = React.useState(dayjs().format("YYYY-MM"))

  // 初始化数据
  useEffect(() => {
    analyticsStore.dailyNoteCount.call()
    analyticsStore.monthlyStats.call()
  }, [])

  // 当月份变化时更新数据
  useEffect(() => {
    analyticsStore.setSelectedMonth(selectedMonth)
  }, [selectedMonth])

  const currentMonth = dayjs().format("YYYY-MM")
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    return dayjs().subtract(i, "month").format("YYYY-MM")
  })

  const data = analyticsStore.dailyNoteCount.value?.map(item => [
    item.date,
    item.count
  ] as [string, number]) ?? []

  const stats = analyticsStore.monthlyStats.value

  return (
    <ScrollArea onBottom={() => { }} fixMobileTopBar className="px-6 space-y-6 md:p-6 mx-auto max-w-7xl" >
      {/* Design V6 - Glass Panel Month Selector */}
      <div className="glass-panel p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <Icon icon="ri-bar-chart-grouped-line" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900">{t('analytics-overview') || 'Overview'}</h2>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('track-your-progress') || 'Track your progress'}</p>
          </div>
        </div>
        <div className="w-56">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="light"
                className="w-full justify-between glass-input h-10 px-4 text-gray-700 hover:bg-white/60"
                endContent={<Icon icon="ri-arrow-down-s-line" className="h-4 w-4 text-gray-400" />}
                startContent={<Icon icon="ri-calendar-line" className="h-4 w-4 text-violet-500" />}
              >
                {selectedMonth}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Select month"
              selectionMode="single"
              selectedKeys={[selectedMonth]}
              className="max-h-[400px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass rounded-xl p-2"
              itemClasses={{
                base: "rounded-lg data-[hover=true]:bg-violet-50 data-[selected=true]:bg-violet-100 data-[selected=true]:text-violet-700",
              }}
              onSelectionChange={(key) => {
                const value = Array.from(key)[0] as string
                setSelectedMonth(value)
              }}
            >
              {last12Months.map((month) => (
                <DropdownItem
                  key={month}
                >
                  {month}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <StatsCards stats={stats ?? {}} />

      <HeatMap
        data={data}
        title={t('heatMapTitle')}
        description={t('heatMapDescription')}
      />

      {
        stats?.tagStats && stats.tagStats.length > 0 && (
          <TagDistributionChart tagStats={stats.tagStats} />
        )
      }
    </ScrollArea >
  )
})

export default Analytics