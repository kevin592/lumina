import i18n from '../i18n';

/**
 * Cron 定时任务辅助函数
 * 处理定时任务时间表达式的转换和列表
 */

/**
 * Cron 时间选项配置
 */
export const cornTimeList: Array<{ label: string; value: string }> = [
  ...(process.env.NODE_ENV == 'development' ? [{
    label: '10 seconds',
    value: '*/10 * * * * *'
  }] : []),
  {
    label: i18n.t('every-day'),
    value: '0 0 * * *'
  },
  {
    label: i18n.t('every-week'),
    value: '0 0 * * 0'
  },
  {
    label: i18n.t('every-month'),
    value: '0 0 1 * *'
  },
  {
    label: i18n.t('every-three-month'),
    value: '0 0 1 */3 *'
  },
  {
    label: i18n.t('every-half-year'),
    value: '0 0 1 */6 *'
  }
];

/**
 * 将 Cron 表达式转换为人类可读格式
 * @param cronTime - Cron 时间表达式
 * @returns 人类可读的时间描述，如果无法识别则返回 undefined
 */
export function humanCronTime(cronTime: string): string | undefined {
  switch (cronTime) {
    // Development mode test case (commented out)
    // case '*/1 * * * *':
    //   return i18n.t('every-1-minutes')
    case '0 0 * * *':
      return i18n.t('every-day');
    case '0 0 * * 0':
      return i18n.t('every-week');
    case '0 0 1 * *':
      return i18n.t('every-month');
    case '0 0 1 */3 *':
      return i18n.t('every-three-month');
    case '0 0 1 */6 *':
      return i18n.t('every-half-year');
    default:
      return undefined;
  }
}
