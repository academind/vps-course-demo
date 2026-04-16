import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'

export const IDEA_MAX_LENGTH = 1_000

export const ideaSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(1, 'Please share an idea first.')
    .max(IDEA_MAX_LENGTH, `Please keep your idea under ${IDEA_MAX_LENGTH} characters.`),
})

export type IdeaInput = z.infer<typeof ideaSchema>

export const submitIdea = createServerFn({ method: 'POST' })
  .inputValidator(ideaSchema)
  .handler(async ({ data }) => {
    const { insertIdea } = await import('./ideas.server')

    try {
      insertIdea(data.idea)
      return { ok: true } as const
    } catch (error) {
      console.error('Failed to save idea.', error)
      throw new Error('Unable to save your idea right now.', { cause: error })
    }
  })
