'use client'

import { ReactNode } from 'react'

interface SwitchTab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface SwitchTabsProps {
  tabs: SwitchTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

function SwitchTabs({ tabs, activeTab, onTabChange }: SwitchTabsProps) {
  return (
    <div className="flex items-center">
      <div className="relative inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.id
                ? 'text-slate-950'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {/* アニメーション背景 */}
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-white rounded-lg shadow-sm" />
            )}
            
            <div className="relative flex items-center gap-1">
              {tab.icon && tab.icon}
              <span>
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SwitchTabs