import { userCaller } from '@server/routerTrpc/_app';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v3';
import { verifyToken } from '@server/lib/helper';

export const upsertLuminaTool = createTool({
  id: 'upsert-lumina-tool',
  description: 'You are a lumina assistant. You can create different types of content. "Lumina" means flash thoughts or sudden inspiration - those fleeting ideas that pop into mind.',
  inputSchema: z.object({
    content: z.string().describe("The content to save. Tag is start with #"),
    token: z.string().optional().describe("internal use, do not pass!")
  }),
  execute: async ({ context, runtimeContext }) => {
    const accountId = runtimeContext?.get('accountId') || (await verifyToken(context.token))?.sub;

    console.log(`create note:${context.content}, accountId:${accountId}`);

    try {
      const caller = userCaller({
        id: String(accountId),
        exp: 0,
        iat: 0,
        name: 'admin',
        sub: String(accountId),
        role: 'superadmin'
      })
      const note = await caller.notes.upsert({
        content: context.content,
      })
      console.log('Created note:', note)
      return note
    } catch (error) {
      console.log('Error creating note:', error)
      return error.message
    }
  }
});