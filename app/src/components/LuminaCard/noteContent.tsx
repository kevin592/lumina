import { MarkdownRender } from '@/components/Common/MarkdownRender';
import { FilesAttachmentRender } from "../Common/AttachmentRender";
import { Note } from '@shared/lib/types';
import { LuminaStore } from '@/store/luminaStore';
import { observer } from 'mobx-react-lite';
import { ReferencesContent } from './referencesContent';

interface NoteContentProps {
  LuminaItem: Note;
  Lumina: LuminaStore;
  isExpanded?: boolean;
  isShareMode?: boolean;
}

export const NoteContent = observer(({ LuminaItem, Lumina, isExpanded, isShareMode }: NoteContentProps) => {
  return (
    <>
      <MarkdownRender
        content={LuminaItem.content}
        onChange={(newContent) => {
          if (isShareMode) return;
          LuminaItem.content = newContent
          Lumina.upsertNote.call({ id: LuminaItem.id, content: newContent, refresh: false })
        }}
        isShareMode={isShareMode}
        largeSpacing={isExpanded}
      />
      <ReferencesContent LuminaItem={LuminaItem} className={`${isExpanded ? 'my-4' : 'my-2'}`} />
      <div className={LuminaItem.attachments?.length != 0 ? 'my-2' : ''}>
        <FilesAttachmentRender files={LuminaItem.attachments ?? []} preview />
      </div>
    </>
  );
});
