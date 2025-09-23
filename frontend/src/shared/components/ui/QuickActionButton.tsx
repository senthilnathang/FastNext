'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from './button';
import QuickActionsMenu from './QuickActionsMenu';

interface QuickActionButtonProps {
  className?: string;
}

export default function QuickActionButton({ className = '' }: QuickActionButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsMenuOpen(true)}
        className={`flex items-center space-x-2 ${className}`}
      >
        <Zap className="h-4 w-4" />
        <span>Quick Actions</span>
      </Button>
      
      <QuickActionsMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}