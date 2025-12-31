import { IconButton } from '../IconButton';
import { useTranslation } from 'react-i18next';
import { EditorStore } from '../../editorStore';
import { Input, Button } from '@heroui/react';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { ScrollArea } from '@/components/Common/ScrollArea';
import { LuminaStore } from '@/store/luminaStore';
import { RootStore } from '@/store/root';
import { AiStore } from '@/store/aiStore';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { SendIcon } from '@/components/Common/Icons';
import { MarkdownRender } from '@/components/Common/MarkdownRender';
import { eventBus } from '@/lib/event';

export const AIWriteButton = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const ai = RootStore.Get(AiStore);
  const scrollRef = useRef<any>(null);
  
  const localStore = RootStore.Local(() => ({
    show: false,
    setShow: (show: boolean) => {
      localStore.show = show;
    },

    async handleSubmit() {
      if (!ai.writeQuestion.trim()) return;
      try {
        ai.writeStream('custom', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content);
      } catch (error) {
        console.error('error:', error);
      }
    }
  }));

  useEffect(() => {
    scrollRef.current?.scrollToBottom();
  }, [ai.writingResponseText]);

  return (
    <Popover
      placement="bottom-start"
      isOpen={localStore.show}
      onOpenChange={localStore.setShow}
      shouldCloseOnBlur={false}
    >
      <PopoverTrigger>
        <div onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          localStore.setShow(true);
        }}>
          <IconButton
            tooltip={t('ai-write')}
            icon="ri-quill-pen-line"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className='flex flex-col p-3 bg-background md:max-w-[500px] max-w-[full]'>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-2 items-center">
            <Input
              className='border-none'
              value={ai.writeQuestion}
              onChange={(e) => ai.writeQuestion = e.target.value}
              placeholder={'Prompt...'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  localStore.handleSubmit();
                }
              }}
              startContent={<i className='ri-sparkling-line text-primary text-sm'></i>}
              endContent={
                ai.isLoading ?
                  <i className="ri-refresh-line text-sm animate-spin"></i> :
                  <SendIcon onClick={localStore.handleSubmit} className='cursor-pointer primary-foreground group-hover:rotate-[-35deg] !transition-all' />
              }
            />

          </div>

          <div className='flex flex-wrap gap-2'>
            
          </div>

          {ai.writingResponseText && (
            <ScrollArea ref={scrollRef} className='p-2 max-h-[400px] max-w-full w-full max-w-full' onBottom={() => { }}>
              {ai.isLoading ?
                <div className='text-sm'>{ai.writingResponseText}</div> :
                <MarkdownRender content={ai.writingResponseText} />
              }
            </ScrollArea>
          )}

          {ai.isWriting && (
            <div className='flex gap-2 items-center'>
              <Button onPress={() => {
                ai.isWriting = false;
                if (ai.currentWriteType == 'polish') {
                  eventBus.emit('editor:replace', ai.writingResponseText);
                } else {
                  eventBus.emit('editor:insert', ai.writingResponseText);
                }
                ai.writingResponseText = '';
                localStore.setShow(false);
              }} startContent={<i className='ri-checkbox-circle-fill text-green-500'></i>}
                size='sm' variant='light' color='success'>{t('accept')}</Button>

              <Button onPress={() => {
                ai.isWriting = false;
                ai.writingResponseText = '';
                localStore.setShow(false);
              }} startContent={<i className='ri-close-circle-fill text-red-500'></i>}
                size='sm' variant='light' color='danger'>{t('reject')}</Button>

              <Button onPress={() => {
                ai.abortAiWrite();
              }} startContent={<i className='ri-stop-circle-fill text-yellow-500'></i>}
                size='sm' variant='light' color='warning'>{t('stop')}</Button>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <Button
              startContent={<i className="ri-expand-left-right-line text-sm"></i>}
              variant='flat'
              color='warning'
              size='sm'
              onPress={() => {
                ai.writeStream('expand', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content);
              }}
            >
              {t('ai-expand')}
            </Button>

            <Button
              startContent={<i className="ri-sparkling-line text-sm"></i>}
              variant='flat'
              color='warning'
              size='sm'
              onPress={() => {
                ai.writeStream('polish', Lumina.isCreateMode ? Lumina.noteContent : Lumina.curSelectedNote!.content);
              }}
            >
              {t('ai-polish')}
            </Button>


            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => localStore.setShow(false)}
              className='ml-auto'
            >
              <i className="ri-close-line text-base"></i>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}); 