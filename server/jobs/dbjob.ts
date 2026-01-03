import { BaseScheduleJob } from "./baseScheduleJob";
import { DBBackupService } from "./dbBackupService";
import { DBRestoreService } from "./dbRestoreService";
import { ExportTimeRange } from "./dbTypes";
import { DBBAK_TASK_NAME } from "@shared/lib/sharedConstant";
import { Context } from "../context";

// Re-export types
export type { ExportTimeRange } from "./dbTypes";

/**
 * 数据库备份任务
 * 负责数据库的备份和恢复操作
 */
export class DBJob extends BaseScheduleJob {
  protected static taskName = DBBAK_TASK_NAME;
  protected static job = this.createJob();

  static {
    this.initializeJob();
  }

  /**
   * 执行备份任务
   */
  protected static async RunTask() {
    return DBBackupService.RunTask();
  }

  /**
   * 恢复数据库
   */
  static async *RestoreDB(filePath: string, ctx: Context) {
    yield* DBRestoreService.RestoreDB(filePath, ctx);
  }

  /**
   * 导出笔记为文件
   */
  static async ExporMDFiles(params: {
    baseURL: string;
    startDate?: Date;
    endDate?: Date;
    ctx: Context;
    format: 'markdown' | 'csv' | 'json';
  }) {
    return DBBackupService.ExporMDFiles(params);
  }
}
