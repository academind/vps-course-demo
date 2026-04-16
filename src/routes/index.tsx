import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IDEA_MAX_LENGTH, ideaSchema, submitIdea } from '../lib/ideas'

export const Route = createFileRoute('/')({
  component: Home,
})

type Status = 'idle' | 'submitting' | 'success' | 'error'

const GENERIC_ERROR = 'Something went wrong. Please try again.'

function Home() {
  const [idea, setIdea] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = ideaSchema.safeParse({ idea })
    if (!parsed.success) {
      setStatus('error')
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Please enter an idea.')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      await submitIdea({ data: parsed.data })
      setIdea('')
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg(GENERIC_ERROR)
    }
  }

  const isSubmitting = status === 'submitting'

  return (
    <main className="min-h-screen px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Share your idea
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Got something brewing? Drop it below and we'll keep it safe.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200"
        >
          <label
            htmlFor="idea"
            className="block text-sm font-medium text-slate-800"
          >
            Your idea
          </label>
          <textarea
            id="idea"
            name="idea"
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value)
              if (status !== 'idle') {
                setStatus('idle')
                setErrorMsg(null)
              }
            }}
            disabled={isSubmitting}
            maxLength={IDEA_MAX_LENGTH}
            rows={6}
            placeholder="What's on your mind?"
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-base font-medium text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Submitting…' : 'Submit idea'}
          </button>

          <div aria-live="polite" className="mt-5 min-h-6 text-sm">
            {status === 'success' && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-emerald-200"
              >
                Thanks! Your idea has been saved.
              </p>
            )}
            {status === 'error' && errorMsg && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-200"
              >
                {errorMsg}
              </p>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
