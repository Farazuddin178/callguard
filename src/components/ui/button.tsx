import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'cg-button inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-5 py-3 text-center font-bold disabled:cursor-default',
  {
    variants: {
      variant: {
        default: 'cg-primary',
        outline: 'cg-outline',
        ghost: 'cg-ghost',
        light: 'cg-light',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Button({
  className, variant, asChild = false, ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />
}
