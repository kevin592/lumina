import { observer } from 'mobx-react-lite';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface OKRStatusPieChartProps {
  objectives: Array<{
    status: string;
    title: string;
  }>;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  PENDING: '#94a3b8',    // 灰色
  IN_PROGRESS: '#3b82f6', // 蓝色
  COMPLETED: '#22c55e',  // 绿色
  CANCELLED: '#ef4444',  // 红色
  BLOCKED: '#f59e0b',    // 橙色
};

/**
 * OKR状态饼图组件
 * 显示不同状态OKR的数量分布
 */
const OKRStatusPieChart = observer(({ objectives }: OKRStatusPieChartProps) => {
  const { t } = useTranslation();

  const data: ChartData[] = [
    {
      name: t('pending') || '待处理',
      value: objectives.filter(o => o.status === 'PENDING').length,
      color: COLORS.PENDING,
    },
    {
      name: t('in-progress') || '进行中',
      value: objectives.filter(o => o.status === 'IN_PROGRESS').length,
      color: COLORS.IN_PROGRESS,
    },
    {
      name: t('completed') || '已完成',
      value: objectives.filter(o => o.status === 'COMPLETED').length,
      color: COLORS.COMPLETED,
    },
    {
      name: t('cancelled') || '已取消',
      value: objectives.filter(o => o.status === 'CANCELLED').length,
      color: COLORS.CANCELLED,
    },
    {
      name: t('blocked') || '已阻塞',
      value: objectives.filter(o => o.status === 'BLOCKED').length,
      color: COLORS.BLOCKED,
    },
  ].filter(d => d.value > 0);

  if (data.length === 0 || objectives.length === 0) {
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
        {t('okr-status-distribution') || 'OKR状态分布'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
});

export default OKRStatusPieChart;
