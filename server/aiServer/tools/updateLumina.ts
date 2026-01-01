import { userCaller } from '@server/routerTrpc/_app';
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
    isArchived: z.union([z.boolean(), z.null()]).default(null).describe('is archived'),
    isTop: z.union([z.boolean(), z.null()]).default(null).describe('is top'),
    isShare: z.union([z.boolean(), z.null()]).default(null),
    isRecycle: z.union([z.boolean(), z.null()]).default(null),
    token: z.string().optional().describe("internal use, do not pass!")
  }),
  execute: async ({ context, runtimeContext }) => {
    const accountId = runtimeContext?.get('accountId') || (await verifyToken(context.token))?.sub;
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
        id: context.id
      })
    } catch (error) {
      console.log(error)
      return error.message
    }
  }
});