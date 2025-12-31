import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Input, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { eventBus } from '@/lib/event';
import PopoverFloat from '.';
import { RootStore } from '@/store';
import { AiStore } from '@/store/aiStore';
import { LuminaStore } from '@/store/luminaStore';
import { SendIcon } from '../Icons';
import { MarkdownRender } from '../MarkdownRender';
import { ScrollArea, ScrollAreaHandles } from '../ScrollArea';
import { useMediaQuery } from 'usehooks-ts';
import ReactDOM from 'react-dom';

export const showAiWriteSuggestions = () => {
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      eventBus.emit('aiwrite:update', { rect })
    }
  })
}

const AiWritePop = observer(() => {
  const { t } = useTranslation()
  const isPc = useMediaQuery('(min-width: 768px)')
  const ai = RootStore.Get(AiStore)
  const scrollRef = useRef<ScrollAreaHandles>(null)
  const Lumina = RootStore.Get(LuminaStore)
  const store = RootStore.Local(() => ({
    rect: null as DOMRect | null,
    show: false,
    hidden() {
      store.show = false
    },

    setData(args: { rect: DOMRect }) {
      store.rect = args.rect
      store.show = true
    },

    async handleSubmit() {
      if (!ai.writeQuestion.trim()) return
      try {
        ai.writeStream('custom', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content)
      } catch (error) {
        console.error('error:', error)
      } finally {
      }
    }
  }))

  useEffect(() => {
    eventBus.on('aiwrite:update', store.setData)
    eventBus.on('aiwrite:hidden', store.hidden)

    return () => {
      eventBus.off('aiwrite:update', store.setData)
      eventBus.off('aiwrite:hidden', store.hidden)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollToBottom()
  }, [ai.writingResponseText])

  const isInsideDialog = () => {
    if (!store.rect) return false;
    const dialogElement = document.querySelector('.modal-content');
    if (!dialogElement) return false;
    
    const dialogRect = dialogElement.getBoundingClientRect();
    return (
      store.rect.top >= dialogRect.top &&
      store.rect.bottom <= dialogRect.bottom &&
      store.rect.left >= dialogRect.left &&
      store.rect.right <= dialogRect.right
    );
  };

  const renderPopover = () => {
    const popover = (
      <PopoverFloat
        show={store.show}
        onHide={store.hidden}
        anchorRect={store.rect}
        maxWidth={isPc ? 700 : 400}
        maxHeight={isPc ? 600 : 400}
        closeOnClickOutside={false}
      >
        <div className="flex flex-col gap-3 min-w-[300px]">
          <div className="flex gap-2">
            <Input
              className='border-none'
              value={ai.writeQuestion}
              onChange={(e) => ai.writeQuestion = e.target.value}
              placeholder={'Prompt...'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  store.handleSubmit()
                }
              }}
              startContent={<i className='text-primary ri-magic-line' style={{fontSize: "16px"}}></i>}
              endContent={<>
                {ai.isLoading ?
                  <i className="ri-loader-4-line animate-spin" style={{fontSize: "16px"}}></i> :
                  <SendIcon onClick={store.handleSubmit} className='cursor-pointer primary-foreground group-hover:rotate-[-35deg] !transition-all' />}
              </>}
            />
          </div>
          {
            ai.writingResponseText != '' && <ScrollArea ref={scrollRef} className='p-2 max-h-[200px]' onBottom={() => { }}>
              {ai.isLoading ? <div className='text-sm'>{ai.writingResponseText}</div> : <MarkdownRender content={ai.writingResponseText} />}
            </ScrollArea>
          }
          {ai.isWriting && (
            <div id='ai-write-suggestions' className='flex gap-2 items-center'>
              <Button onPress={() => {
                ai.isWriting = false;
                eventBus.emit('editor:insert', ai.writingResponseText)
                ai.writingResponseText = ''
                store.hidden()
              }} startContent={<i className='ri-checkbox-circle-fill text-green-500'></i>} size='sm' variant='light' color='success'>{t('accept')}</Button>
              <Button onPress={() => {
                ai.isWriting = false;
                ai.writingResponseText = ''
                store.hidden()
              }} startContent={<i className='ri-close-circle-fill text-red-500'></i>} size='sm' variant='light' color='danger'>{t('reject')}</Button>
              <Button onPress={() => {
                ai.abortAiWrite();
              }} startContent={<i className='ri-stop-circle-fill'></i>} size='sm' variant='light' color='warning'>{t('stop')} </Button>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <Button startContent={<i className="ri-expand-left-right-line" style={{fontSize: "16px"}}></i>} variant='flat' color='warning' size='sm' onPress={e => {
              ai.writeStream('expand', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content)
              // store.hidden()
            }}>{t('ai-expand')}</Button>
            <Button startContent={<i className="ri-sparkling-line" style={{fontSize: "16px"}}></i>} variant='flat' color='warning' size='sm' onPress={e => {
              ai.writeStream('polish', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content)
              // store.hidden()
            }}>{t('ai-polish')}</Button>
            <Button className='ml-auto' isLoading={ai.isLoading} isIconOnly size='sm' onPress={e => {
              store.hidden()
            }}>
              <i className="ri-close-fill"></i>
            </Button>
          </div>
        </div>
      </PopoverFloat>
    );

    if (isInsideDialog()) {
      return ReactDOM.createPortal(
        popover,
        document.querySelector('.modal-content')!
      );
    }

    return ReactDOM.createPortal(
      popover,
      document.body
    );
  };

  return renderPopover();
});

export default AiWritePop;