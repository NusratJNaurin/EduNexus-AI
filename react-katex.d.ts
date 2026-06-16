declare module "react-katex" {
  import type { ReactNode } from "react"

  export interface MathProps {
    math: string
    errorColor?: string
    renderError?: (error: Error) => ReactNode
  }

  export function BlockMath(props: MathProps): JSX.Element
  export function InlineMath(props: MathProps): JSX.Element
}