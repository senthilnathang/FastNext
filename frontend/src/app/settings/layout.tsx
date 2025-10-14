'use client';

import React from 'react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
