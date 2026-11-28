import { RibbonFieldBackground } from '@designcodeio/threeui/components/RibbonFieldBackground'
import { Component, type PropsWithChildren } from 'react'

class FieldBoundary extends Component<PropsWithChildren, { unavailable: boolean }> {
  state = { unavailable: false }

  static getDerivedStateFromError() {
    return { unavailable: true }
  }

  render() {
    return this.state.unavailable ? null : this.props.children
  }
}

export default function HeroField() {
  return <FieldBoundary>
    <RibbonFieldBackground speed={0.6} />
  </FieldBoundary>
}
