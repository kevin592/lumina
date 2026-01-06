import { observer } from 'mobx-react-lite';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiDownloadLine, RiFilePdfLine, RiFileExcelLine, RiPrinterLine } from 'react-icons/ri';
import { Objective, KeyResult, Task } from '@/store/module/OKRStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  // 导出为PDF
  const handleExportPDF = async () => {
    try {
      // 查找报表内容容器
      const element = document.getElementById('reports-content');
      if (!element) {
        console.error('未找到报表内容容器');
        return;
      }

      // 显示加载提示
      const loadingMsg = document.createElement('div');
      loadingMsg.id = 'pdf-loading';
      loadingMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 16px;
      `;
      loadingMsg.textContent = '正在生成PDF...';
      document.body.appendChild(loadingMsg);

      // 使用html2canvas将DOM转换为canvas
      const canvas = await html2canvas(element, {
        scale: 2, // 提高清晰度
        useCORS: true, // 支持跨域图片
        logging: false,
        backgroundColor: '#ffffff',
      });

      // 移除加载提示
      document.body.removeChild(loadingMsg);

      // 计算PDF尺寸
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4宽度（mm）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 添加图片到PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // 保存PDF文件
      const filename = `okr-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      onExportPDF?.();
    } catch (error) {
      console.error('PDF导出失败:', error);
      // 移除可能的加载提示
      const loadingMsg = document.getElementById('pdf-loading');
      if (loadingMsg) {
        document.body.removeChild(loadingMsg);
      }
      alert('PDF导出失败，请重试');
    }
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
