import { observer } from 'mobx-react-lite';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiDownloadLine, RiFilePdfLine, RiFileExcelLine, RiPrinterLine } from 'react-icons/ri';
import { Objective, KeyResult, Task } from '@/store/module/OKRStore';

interface ExportOptionsProps {
  objectives?: Objective[];
  tasks?: Task[];
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
}

/**
 * 导出选项组件
 * 支持导出为PDF、Excel、CSV
 */
const ExportOptions = observer(({
  objectives,
  tasks,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onPrint,
}: ExportOptionsProps) => {
  const { t } = useTranslation();

  // 导出为CSV
  const handleExportCSV = () => {
    if (tasks && tasks.length > 0) {
      exportTasksToCSV(tasks);
    } else if (objectives && objectives.length > 0) {
      exportObjectivesToCSV(objectives);
    }
    onExportCSV?.();
  };

  // 导出任务为CSV
  const exportTasksToCSV = (taskList: Task[]) => {
    const headers = [
      t('title') || '标题',
      t('status') || '状态',
      t('priority') || '优先级',
      t('due-date') || '截止日期',
      t('estimated-hours') || '预估工时',
      t('actual-hours') || '实际工时',
    ];

    const rows = taskList.map(task => [
      task.title,
      task.status,
      task.priority,
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
      task.estimatedHours?.toString() || '',
      task.actualHours?.toString() || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    downloadCSV(csvContent, `tasks-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 导出OKR为CSV
  const exportObjectivesToCSV = (objectiveList: Objective[]) => {
    const headers = [
      t('title') || '标题',
      t('status') || '状态',
      t('period') || '周期',
      t('start-date') || '开始日期',
      t('end-date') || '结束日期',
      t('progress') || '进度',
      t('kr-count') || 'KR数量',
      t('task-count') || '任务数量',
    ];

    const rows = objectiveList.map(obj => [
      obj.title,
      obj.status,
      obj.period,
      new Date(obj.startDate).toLocaleDateString(),
      obj.endDate ? new Date(obj.endDate).toLocaleDateString() : '',
      `${obj.progress}%`,
      obj._count?.keyResults || 0,
      obj._count?.tasks || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    downloadCSV(csvContent, `okr-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 下载CSV文件
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 打印
  const handlePrint = () => {
    window.print();
    onPrint?.();
  };

  // 导出为PDF（需要后端支持或前端库）
  const handleExportPDF = () => {
    // TODO: 实现PDF导出功能
    // 可以使用 jsPDF 或 html2canvas + jspdf
    alert('PDF导出功能开发中...');
    onExportPDF?.();
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="flat"
          startContent={<RiDownloadLine size={18} />}
          endContent={<i className="ri-arrow-down-s-line" />}
        >
          {t('export') || '导出'}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Export options"
        onAction={(key) => {
          if (key === 'csv') handleExportCSV();
          else if (key === 'pdf') handleExportPDF();
          else if (key === 'print') handlePrint();
        }}
      >
        <DropdownItem
          key="csv"
          startContent={<RiFileExcelLine size={18} className="text-green-500" />}
        >
          {t('export-csv') || '导出为CSV'}
        </DropdownItem>
        <DropdownItem
          key="pdf"
          startContent={<RiFilePdfLine size={18} className="text-red-500" />}
        >
          {t('export-pdf') || '导出为PDF'}
        </DropdownItem>
        <DropdownItem
          key="print"
          startContent={<RiPrinterLine size={18} className="text-blue-500" />}
        >
          {t('print') || '打印'}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
});

export default ExportOptions;
