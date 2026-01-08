import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

interface DashboardStatsCardProps {
  objectiveCount?: number;
  activeKRCount?: number;
  activeTaskCount?: number;
  overallProgress?: number;
}

/**
 * Dashboard Stats Row - Fortent V6 Glass Style
 */
const DashboardStatsCard = observer(({
  objectiveCount = 0,
  activeKRCount = 0,
  activeTaskCount = 0,
  overallProgress = 0
}: DashboardStatsCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Stat 1: Total Progress (Hero Stat) */}
      <div className="glass-card p-5 relative overflow-hidden group col-span-2 md:col-span-1">
        <div className="absolute right-[-10px] top-[-10px] p-8 opacity-5 group-hover:opacity-10 transition-transform group-hover:scale-110">
          <i className="ri-focus-2-line text-6xl text-violet-900"></i>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('overall-progress') || 'TOTAL PROGRESS'}</p>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-display font-bold text-gray-900">{overallProgress}%</span>
          {overallProgress > 0 && (
            <span className="text-xs font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded">Active</span>
          )}
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000"
            style={{ width: `${overallProgress}%` }}
          >
          </div>
        </div>
      </div>

      {/* Stat 2: Active Objectives */}
      <div className="glass-card p-5 flex flex-col justify-center transition-all hover:scale-[1.02]">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('objectives') || 'OBJECTIVES'}</p>
        <span className="text-3xl font-display font-bold text-gray-900">{objectiveCount}</span>
        <span className="text-xs text-gray-500 mt-1">{t('active') || 'Active now'}</span>
      </div>

      {/* Stat 3: Key Results */}
      <div className="glass-card p-5 flex flex-col justify-center transition-all hover:scale-[1.02]">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('active-krs') || 'KEY RESULTS'}</p>
        <span className="text-3xl font-display font-bold text-gray-900">{activeKRCount}</span>
        <span className="text-xs text-violet-500 mt-1 font-medium">{t('in-progress') || 'In Progress'}</span>
      </div>

      {/* Stat 4: Pending Tasks */}
      <div className="glass-card p-5 flex flex-col justify-center transition-all hover:scale-[1.02]">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('active-tasks') || 'PENDING TASKS'}</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-display font-bold text-gray-900">{activeTaskCount}</span>
          <i className="ri-list-check text-violet-300 text-xl"></i>
        </div>
        <span className="text-xs text-gray-500 mt-1">{t('needs-action') || 'Needs Action'}</span>
      </div>
    </div>
  );
});

export default DashboardStatsCard;
