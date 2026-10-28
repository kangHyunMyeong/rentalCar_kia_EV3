import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'on-dark'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  arrow?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-deep-teal text-white hover:bg-[#0c2f2f] shadow-[0_10px_28px_rgba(16,58,58,0.18)]',
  secondary:
    'bg-transparent text-deep-teal border border-deep-teal/30 hover:border-deep-teal hover:bg-white/50',
  ghost: 'bg-transparent text-deep-teal hover:bg-deep-teal/5',
  'on-dark':
    'bg-soft-mint text-deep-teal hover:bg-white shadow-[0_10px_28px_rgba(0,0,0,0.12)]',
}

const sizeClass: Record<Size, string> = {
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'group inline-flex items-center justify-center gap-2 rounded-[14px] font-medium transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      {...rest}
    >
      <span>{children}</span>
      {arrow ? (
        <span
          aria-hidden
          className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      ) : null}
    </button>
  )
}
