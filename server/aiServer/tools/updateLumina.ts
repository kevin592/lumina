import { userCaller } from '@server/routerTrpc/_app';
import { NoteType } from '@shared/lib/types';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v3';
import { verifyToken } from '@server/lib/helper';

export const updateLuminaTool = createTool({
  id: 'update-lumina-tool',
  description: 'you are a lumina assistant,you can use api to update lumina,save to database',
  //@ts-ignore
  inputSchema: z.object({
    id: z.number().describe('the note ID'),
    content: z.string().describe('note content'),
    type: z.string().optional().default('lumina').describe('Optional: The type of content: "lumina" (flash thoughts/sudden ideas/fleeting inspiration - the default) or "todo" (tasks to be done)'),
    isArchived: z.union([z.boolean(), z.null()]).default(null).describe('is archived'),
    isTop: z.union([z.boolean(), z.null()]).default(null).describe('is top'),
    isShare: z.union([z.boolean(), z.null()]).default(null),
    isRecycle: z.union([z.boolean(), z.null()]).default(null),
    token: z.string().optional().describe("internal use, do not pass!")
  }),
  execute: async ({ context, runtimeContext }) => {
    const accountId = runtimeContext?.get('accountId') || (await verifyToken(context.token))?.sub;
    let noteType: NoteType;
    const typeStr = (context.type || 'lumina').toLowerCase();

    switch (typeStr) {
      case 'todo':
      case '2':
        noteType = NoteType.TODO; // 2
        break;
      case 'lumina':
      case '0':
      default:
        noteType = NoteType.LUMINA; // 0
        break;
    }
    try {
      const caller = userCaller({
        id: String(accountId),
        exp: 0,
        iat: 0,
        name: 'admin',
        sub: String(accountId),
        role: 'superadmin'
      })
      return await caller.notes.upsert({
        content: context.content,
        type: noteType,
        id: context.id
      })
    } catch (error) {
      console.log(error)
      return error.message
    }
  }
});