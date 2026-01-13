import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { useTranslation } from "react-i18next";
import { UploadFileWrapper } from "../Common/UploadFile";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { ShowMemosProgressDialog } from "../Common/ImportMemosProgress";
import { ShowLuminaProgressDialog } from "../Common/ImportLuminaProgress";
import { ShowMarkdownProgressDialog } from "../Common/ImportMarkdownProgress";


export const ImportSetting = observer(() => {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* 从 .bko 文件导入 */}
      <div className="glass-card p-8 text-center border-dashed border-2 border-gray-300 hover:border-violet-400 transition-all group cursor-pointer bg-white/30">
        <div className="w-16 h-16 rounded-full bg-violet-50 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
          <i className="ri-file-zip-line text-3xl text-violet-600"></i>
        </div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">{t('import-from-bko')}</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{t('import-from-bko-tip')}</p>
        <UploadFileWrapper onUpload={async ({ filePath, fileName }) => {
          if (!fileName.endsWith('.bko')) {
            return RootStore.Get(ToastPlugin).error(t('not-a-bko-file'))
          }
          ShowLuminaProgressDialog(filePath)
        }}>
          <button className="px-6 py-2 bg-white border border-gray-200 rounded-full font-bold text-sm hover:bg-gray-50 shadow-sm transition-all">
            {t('select-file')}
          </button>
        </UploadFileWrapper>
      </div>

      {/* 从备忘录导入 */}
      <div className="glass-card p-8 text-center border-dashed border-2 border-gray-300 hover:border-violet-400 transition-all group cursor-pointer bg-white/30">
        <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
          <i className="ri-database-2-line text-3xl text-blue-600"></i>
        </div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">{t('import-from-memos-memos_prod-db')}</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{t('when-exporting-memos_prod-db-please-close-the-memos-container-to-avoid-partial-loss-of-data')}</p>
        <UploadFileWrapper onUpload={async ({ filePath, fileName }) => {
          if (!fileName.endsWith('.db')) {
            return RootStore.Get(ToastPlugin).error('Not a Memos database file')
          }
          ShowMemosProgressDialog(filePath)
        }}>
          <button className="px-6 py-2 bg-white border border-gray-200 rounded-full font-bold text-sm hover:bg-gray-50 shadow-sm transition-all">
            {t('select-file')}
          </button>
        </UploadFileWrapper>
      </div>

      {/* 从 Markdown 导入 */}
      <div className="glass-card p-8 text-center border-dashed border-2 border-gray-300 hover:border-violet-400 transition-all group cursor-pointer bg-white/30">
        <div className="w-16 h-16 rounded-full bg-green-50 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
          <i className="ri-markdown-line text-3xl text-green-600"></i>
        </div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">{t('import-from-markdown')}</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{t('import-from-markdown-tip')}</p>
        <UploadFileWrapper onUpload={async ({ filePath, fileName }) => {
          if (!fileName.toLowerCase().endsWith('.md') && !fileName.toLowerCase().endsWith('.zip')) {
            return RootStore.Get(ToastPlugin).error(t('not-a-markdown-or-zip-file'))
          }
          ShowMarkdownProgressDialog(filePath)
        }}>
          <button className="px-6 py-2 bg-white border border-gray-200 rounded-full font-bold text-sm hover:bg-gray-50 shadow-sm transition-all">
            {t('select-file')}
          </button>
        </UploadFileWrapper>
      </div>
    </div>
  )
})
