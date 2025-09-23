"use client"

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { useTheme } from '@/shared/services/ThemeContext'

export function ThemeDemo() {
  const { theme, actualTheme } = useTheme()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-responsive-xl">Theme System Demo</CardTitle>
          <CardDescription>
            Current theme: <Badge variant="outline">{theme}</Badge> 
            {theme === 'system' && (
              <> (resolved to <Badge variant="outline">{actualTheme}</Badge>)</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="default">Default Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="success">Success Button</Button>
            <Button variant="warning">Warning Button</Button>
            <Button variant="info">Info Button</Button>
            <Button variant="link">Link Button</Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Light Card</CardTitle>
                <CardDescription>This is a sample card component</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card demonstrates how the theme system affects different components.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-accent">
              <CardHeader>
                <CardTitle className="text-lg">Accent Card</CardTitle>
                <CardDescription>This card uses the accent background</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The accent colors adapt to the current theme automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="text-lg">Muted Card</CardTitle>
                <CardDescription>This card uses the muted background</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All colors are semantic and theme-aware.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-responsive-lg font-semibold">Responsive Text Sizes</h3>
            <p className="text-responsive-xs">Extra small responsive text (12px → 12px)</p>
            <p className="text-responsive-sm">Small responsive text (14px → 14px)</p>
            <p className="text-responsive-base">Base responsive text (16px → 16px)</p>
            <p className="text-responsive-lg">Large responsive text (18px → 20px on sm+)</p>
            <p className="text-responsive-xl">Extra large responsive text (20px → 24px on sm+ → 30px on md+)</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-responsive-lg font-semibold">Color Palette</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">Primary</div>
              <div className="bg-secondary text-secondary-foreground p-2 rounded text-xs text-center">Secondary</div>
              <div className="bg-accent text-accent-foreground p-2 rounded text-xs text-center">Accent</div>
              <div className="bg-muted text-muted-foreground p-2 rounded text-xs text-center">Muted</div>
              <div className="bg-destructive text-destructive-foreground p-2 rounded text-xs text-center">Destructive</div>
              <div className="bg-success text-success-foreground p-2 rounded text-xs text-center">Success</div>
              <div className="bg-warning text-warning-foreground p-2 rounded text-xs text-center">Warning</div>
              <div className="bg-info text-info-foreground p-2 rounded text-xs text-center">Info</div>
              <div className="bg-brand-primary text-white p-2 rounded text-xs text-center">Brand Primary</div>
              <div className="bg-brand-secondary text-white p-2 rounded text-xs text-center">Brand Secondary</div>
              <div className="bg-brand-accent text-white p-2 rounded text-xs text-center">Brand Accent</div>
              <div className="border border-border bg-background text-foreground p-2 rounded text-xs text-center">Border</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}