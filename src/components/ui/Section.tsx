import type { ReactNode } from 'react'
import { Container } from './Container'

interface SectionProps {
  id: string
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
  tone?: 'mist' | 'surface' | 'teal'
}

const toneClass = {
  mist: 'bg-silver-mist text-ink',
  surface: 'bg-surface text-ink',
  teal: 'bg-deep-teal text-white',
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className = '',
  tone = 'mist',
}: SectionProps) {
  return (
    <section id={id} className={['section-pad', toneClass[tone], className].join(' ')}>
      <Container>
        <header className="mb-10 max-w-2xl md:mb-14">
          {eyebrow ? (
            <p
              className={[
                'mb-3 text-xs font-semibold tracking-[0.18em] uppercase',
                tone === 'teal' ? 'text-soft-mint' : 'text-deep-teal/70',
              ].join(' ')}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={[
              'text-balance text-3xl font-semibold tracking-tight md:text-4xl',
              tone === 'teal' ? 'text-white' : 'text-ink',
            ].join(' ')}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={[
                'mt-4 text-base leading-relaxed md:text-lg',
                tone === 'teal' ? 'text-white/75' : 'text-ink-muted',
              ].join(' ')}
            >
              {description}
            </p>
          ) : null}
        </header>
        {children}
      </Container>
    </section>
  )
}
