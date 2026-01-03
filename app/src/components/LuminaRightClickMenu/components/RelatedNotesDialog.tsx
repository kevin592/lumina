import { Note } from "@shared/lib/types";
import { LuminaCard } from "../../LuminaCard";

interface RelatedNotesDialogProps {
  relatedNotes: Note[];
}

/**
 * 相关笔记对话框内容组件
 */
export const RelatedNotesDialogContent = ({ relatedNotes }: RelatedNotesDialogProps) => {
  return (
    <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
      {relatedNotes.map((note: Note) => (
        <LuminaCard key={note.id} LuminaItem={note} withoutHoverAnimation />
      ))}
    </div>
  );
};
