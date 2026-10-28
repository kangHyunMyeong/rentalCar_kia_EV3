import type { ElementType, ReactNode } from 'react'

interface ContainerProps {
  as?: ElementType
  className?: string
  children: ReactNode
  id?: string
}

export function Container({
  as: Tag = 'div',
  className = '',
  children,
  id,
}: ContainerProps) {
  return (
    <Tag id={id} className={['content-width', className].join(' ')}>
      {children}
    </Tag>
  )
}
