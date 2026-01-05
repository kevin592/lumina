import { observer } from 'mobx-react-lite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface OKRProgressChartProps {
  objectives: Array<{
    id: number;
    title: string;
    progress: number;
    status: string;
  }>;
}

interface ChartData {
  name: string;
  progress: number;
  status: string;
  fullName: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
  BLOCKED: '#f59e0b',
};

/**
 * OKR进度柱状图组件
 * 显示各OKR的完成进度对比
 */
const OKRProgressChart = observer(({ objectives }: OKRProgressChartProps) => {
  const { t } = useTranslation();

  const data: ChartData[] = objectives
    .filter(o => o.status !== 'CANCELLED')
    .map(o => ({
      name: o.title.length > 15 ? o.title.substring(0, 15) + '...' : o.title,
      progress: Number(o.progress) || 0,
      status: o.status,
      fullName: o.title,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 10); // 只显示前10个

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400 py-8">
          {t('no-data') || '暂无数据'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {t('okr-progress-comparison') || 'OKR进度对比'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={150} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="font-semibold">{payload[0].payload.fullName}</p>
                    <p className="text-sm">
                      {t('progress') || '进度'}: {payload[0].value}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
});

export default OKRProgressChart;
