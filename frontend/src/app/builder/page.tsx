"use client"

import React from 'react'
import UIBuilder from '@/components/builder/UIBuilder'

export default function BuilderPage() {
  // For demo purposes, using hardcoded IDs
  // In a real app, these would come from route params or state
  const projectId = 1
  const pageId = 1

  return (
    <div className="h-screen">
      <UIBuilder projectId={projectId} pageId={pageId} />
    </div>
  )
}