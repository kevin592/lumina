import { SendIcon } from '../../../Icons';
import { EditorStore } from '../../editorStore';
import { observer } from 'mobx-react-lite';

interface Props {
  store: EditorStore;
  isSendLoading?: boolean;
}

export const SendButton = observer(({ store, isSendLoading }: Props) => {
  return (
    <button
      onClick={(e) => {
        if(isSendLoading) return
        e.preventDefault()
        e.stopPropagation()
        store.handleSend()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if(isSendLoading) return
        store.handleSend()
      }}
      // Design v2.0 - 完全按原型的发送按钮样式
      className='bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-black transition-all shadow-lg shadow-gray-900/20 flex items-center gap-2 cursor-pointer disabled:opacity-50'
      disabled={isSendLoading || store.files?.some(i => i.uploadPromise?.loading?.value)}
    >
      {isSendLoading || store.files?.some(i => i.uploadPromise?.loading?.value) ? (
        <i className="ri-loader-line text-base"></i>
      ) : (
        <>
          <span>发送</span>
          <i className="ri-arrow-right-line text-xs opacity-50"></i>
        </>
      )}
    </button>
  );
})