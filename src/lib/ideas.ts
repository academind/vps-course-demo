import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'

export const ideaSchema = z.object({
  idea: z.string().trim().min(1, 'Please share an idea first.'),
})

export type IdeaInput = z.infer<typeof ideaSchema>

export const submitIdea = createServerFn({ method: 'POST' })
  .inputValidator(ideaSchema)
  .handler(async ({ data }) => {
    const { insertIdea } = await import('./ideas.server')
    try {
      insertIdea(data.idea)
      return { ok: true } as const
    } catch {
      throw new Error('Unable to save your idea right now.')
    }
  })
