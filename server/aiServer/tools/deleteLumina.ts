import { userCaller } from '@server/routerTrpc/_app';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v3';
import { verifyToken } from '@server/lib/helper';

export const deleteLuminaTool = createTool({
  id: 'delete-lumina-tool',
  description: 'you are a lumina assistant,you can use api to delete lumina,save to database',
  inputSchema: z.object({
    ids: z.array(z.number()),
    token: z.string().optional().describe("internal use, do not pass!")
  }) as any,
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
      const note = await caller.notes.trashMany({
        ids: context.ids
      })
      return true
    } catch (error) {
      console.log(error)
      return error.message
    }
  }
});