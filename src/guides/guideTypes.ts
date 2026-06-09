import type { ReactNode } from 'react'

export interface RibbonGuideEntry {
  ribbonId: string
  content: ReactNode
}

export interface Guide {
  id: string
  title: string
  description: ReactNode
  ribbonGuideEntries: RibbonGuideEntry[]
}
