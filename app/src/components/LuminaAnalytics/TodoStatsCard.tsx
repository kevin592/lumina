import { observer } from "mobx-react-lite"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useMemo } from "react"
import { Icon } from '@/components/Common/Iconify/icons'
import { LuminaStore } from '@/store/luminaStore'
import { RootStore } from '@/store'
import dayjs from 'dayjs'

interface TodoStats {
  total: number
  pending: number
  completed: number
  overdue: number
  todayCompleted: number
  weekCompleted: number
  todayCompletedRate: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
}

interface StatCardProps {
  label: string
  value: number | string
  delay?: number
  gradient: string
  icon: string
  suffix?: string
}

const gradients = [
  "from-[#FF6B6B] via-[#4ECDC4] to-[#45B7D1]",
  "from-[#08AEEA] via-[#2AF598] to-[#4FACFE]",
  "from-[#FF9A8B] via-[#FF6A88] to-[#FF99AC]",
  "from-[#A9C9FF] via-[#FFBBEC] to-[#F3A0F7]",
  "from-[#21D4FD] via-[#2876F9] to-[#B721FF]",
  "from-[#FEE140] via-[#FA709A] to-[#FF8177]"
]

const StatCard = ({ label, value, delay = 0, gradient, icon, suffix = '' }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-card hover:shadow-float transition-shadow duration-300 ring-1 ring-gray-900/5 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={icon} className="w-5 h-5 text-gray-400" />
        <p className="text-xs uppercase font-bold text-gray-500">{label}</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={String(value)}
          className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            delay: delay,
            type: "spring",
            stiffness: 200,
            damping: 20
          }}
        >
          {value}{suffix}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

const calculateTodoStats = (todos: any[]): TodoStats => {
  const now = dayjs();
  const todayStart = now.startOf('day');
  const todayEnd = now.endOf('day');
  const weekStart = now.startOf('week').add(1, 'day');
  const weekEnd = now.endOf('week').add(1, 'day');

  const todayTodos = todos.filter(t => {
    const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;
    return completedAt && completedAt.isAfter(todayStart) && completedAt.isBefore(todayEnd);
  });

  const weekTodos = todos.filter(t => {
    const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;
    return completedAt && completedAt.isAfter(weekStart) && completedAt.isBefore(weekEnd);
  });

  const overdueCount = todos.filter(t => {
    if (t.metadata?.todoStatus === 'completed') return false;
    if (!t.metadata?.expireAt) return false;
    return dayjs(t.metadata.expireAt).isBefore(now, 'day');
  }).length;

  const todayTasks = todos.filter(t => {
    const isDueToday = t.metadata?.expireAt && dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === now.format('YYYY-MM-DD');
    return isDueToday;
  });

  const todayCompletedCount = todayTasks.filter(t => t.metadata?.todoStatus === 'completed').length;

  return {
    total: todos.length,
    pending: todos.filter(t => t.metadata?.todoStatus !== 'completed').length,
    completed: todos.filter(t => t.metadata?.todoStatus === 'completed').length,
    overdue: overdueCount,
    todayCompleted: todayTodos.length,
    weekCompleted: weekTodos.length,
    todayCompletedRate: todayTasks.length > 0 ? Math.round((todayCompletedCount / todayTasks.length) * 100) : 0,
    highPriority: todos.filter(t => t.metadata?.todoPriority === 4 && t.metadata?.todoStatus !== 'completed').length,
    mediumPriority: todos.filter(t => t.metadata?.todoPriority === 3 && t.metadata?.todoStatus !== 'completed').length,
    lowPriority: todos.filter(t => t.metadata?.todoPriority === 2 && t.metadata?.todoStatus !== 'completed').length,
  };
};

export const TodoStatsCard = observer(() => {
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore)

  const todos = Lumina.todoList?.value || []
  const stats = useMemo(() => calculateTodoStats(todos), [todos, Lumina.updateTicker])

  const randomGradients = useMemo(() => {
    const indices = Array.from({ length: gradients.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      //@ts-ignore
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices.slice(0, 6).map(i => gradients[i]!)
  }, [])

  const statItems = [
    { label: '任务总数', value: stats.total, delay: 0, gradient: randomGradients[0]!, icon: 'ri:task-line' },
    { label: '待完成', value: stats.pending, delay: 0.1, gradient: randomGradients[1]!, icon: 'ri:time-line' },
    { label: '已完成', value: stats.completed, delay: 0.2, gradient: randomGradients[2]!, icon: 'ri:checkbox-circle-line' },
    { label: '逾期任务', value: stats.overdue, delay: 0.3, gradient: randomGradients[3]!, icon: 'ri:error-warning-line' },
    { label: '今日完成率', value: stats.todayCompletedRate, delay: 0.4, gradient: randomGradients[4]!, icon: 'ri:percentage-line', suffix: '%' },
    { label: '本周完成', value: stats.weekCompleted, delay: 0.5, gradient: randomGradients[5]!, icon: 'ri:calendar-check-line' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statItems.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          delay={item.delay}
          gradient={item.gradient}
          icon={item.icon}
          suffix={item.suffix}
        />
      ))}
    </div>
  )
})
