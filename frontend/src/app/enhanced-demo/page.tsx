'use client';

import React, { useState } from 'react';
import { Card } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { Badge } from '@/shared/components/badge';
import { 
  Palette, 
  Sidebar, 
  Mouse, 
  Keyboard, 
  Zap, 
  Eye,
  Settings,
  Moon,
  Sun,
  Monitor,
  PanelLeft,
  RotateCcw
} from 'lucide-react';
import { EnhancedThemeToggle, CompactThemeToggle, ThemeIndicator } from '@/shared/components/EnhancedThemeToggle';
import { cn } from '@/shared/utils';

export default function EnhancedDemoPage() {
  const [activeDemo, setActiveDemo] = useState<string>('overview');

  const features = [
    {
      id: 'sidebar',
      title: 'Enhanced Sidebar',
      description: 'Hover-to-expand functionality with smooth animations',
      icon: Sidebar,
      color: 'bg-blue-500',
      highlights: [
        'Hover to expand when collapsed',
        'Persistent state in localStorage',
        'Keyboard shortcuts (Ctrl+B)',
        'Smooth transitions and animations',
        'Tooltip support for collapsed items'
      ]
    },
    {
      id: 'theme',
      title: 'Advanced Theme Switcher',
      description: 'Rich theme selection with previews and animations',
      icon: Palette,
      color: 'bg-purple-500',
      highlights: [
        'Visual theme previews',
        'System preference detection',
        'Smooth color transitions',
        'Multiple toggle variants',
        'Theme indicator in status bar'
      ]
    },
    {
      id: 'interactions',
      title: 'Enhanced Interactions',
      description: 'Improved user experience with micro-interactions',
      icon: Mouse,
      color: 'bg-green-500',
      highlights: [
        'Hover effects and scale transforms',
        'Focus states with ring indicators',
        'Loading states and skeletons',
        'Accessibility improvements',
        'Touch-friendly mobile design'
      ]
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Power user features for quick navigation',
      icon: Keyboard,
      color: 'bg-orange-500',
      highlights: [
        'Ctrl+B: Toggle sidebar',
        'F11: Toggle fullscreen',
        'Esc: Close mobile sidebar',
        'Tab navigation support',
        'Screen reader compatibility'
      ]
    }
  ];

  const demoSections = [
    {
      id: 'overview',
      title: 'Features Overview',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="p-6 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-start space-x-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg', feature.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {feature.description}
                    </p>
                    <div className="space-y-2">
                      {feature.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )
    },
    {
      id: 'theme-demo',
      title: 'Theme Switcher Demo',
      content: (
        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Theme Switcher Variants</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Enhanced Dropdown</h4>
                <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <EnhancedThemeToggle />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rich preview with theme descriptions
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Compact Toggle</h4>
                <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <CompactThemeToggle />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Quick cycling through themes
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Theme Indicator</h4>
                <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ThemeIndicator />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Status bar indicator
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Theme Switching Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  <Sun className="h-3 w-3 mr-1" />
                  Light Mode
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optimal for bright environments and daytime use
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  <Moon className="h-3 w-3 mr-1" />
                  Dark Mode
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Reduces eye strain in low-light conditions
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  <Monitor className="h-3 w-3 mr-1" />
                  System Mode
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically adapts to system preferences
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visual previews before switching
                </p>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 'sidebar-demo',
      title: 'Sidebar Features Demo',
      content: (
        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <PanelLeft className="h-5 w-5" />
              <span>Sidebar Enhancements</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Hover to Expand</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mouse className="h-4 w-4 text-blue-500" />
                    <span>Hover over collapsed sidebar to expand</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Try hovering over the sidebar when it&apos;s collapsed
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Persistent State</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm">
                    <Settings className="h-4 w-4 text-green-500" />
                    <span>Remembers your preference</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Sidebar state saved to localStorage
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm">Toggle sidebar</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  Ctrl + B
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm">Toggle fullscreen</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  F11
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm">Close mobile sidebar</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  Escape
                </kbd>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 'animations',
      title: 'Animations & Transitions',
      content: (
        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Smooth Animations</span>
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
                  Hover Scale Effect
                </Button>
                <Button variant="outline" className="transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  Color Transition
                </Button>
                <Button variant="ghost" className="transition-all duration-200 hover:rotate-1">
                  Rotation Effect
                </Button>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <h4 className="font-medium mb-2">Animation Features</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>• Smooth sidebar expand/collapse transitions</div>
                  <div>• Theme switching with color interpolation</div>
                  <div>• Hover effects with micro-interactions</div>
                  <div>• Loading states with skeleton animations</div>
                  <div>• Focus rings for accessibility</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Enhanced UI Features Demo
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Explore the enhanced sidebar, theme switcher, and interactive features inspired by Midday.ai
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {demoSections.map((section) => (
          <Button
            key={section.id}
            variant={activeDemo === section.id ? 'default' : 'outline'}
            onClick={() => setActiveDemo(section.id)}
            className="transition-all duration-200"
          >
            {section.title}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {demoSections.find(section => section.id === activeDemo)?.content}
      </div>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <RotateCcw className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Try the Enhanced Features
            </h3>
            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <div>• Collapse the sidebar and hover over it to see the expansion effect</div>
              <div>• Use Ctrl+B to quickly toggle the sidebar</div>
              <div>• Try the enhanced theme switcher in the header</div>
              <div>• Check out the status bar at the bottom for theme indicators</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}