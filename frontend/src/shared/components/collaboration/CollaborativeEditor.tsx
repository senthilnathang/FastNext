/**
 * CollaborativeEditor component demonstrating real-time collaboration features
 */

import React, { useRef, useState, useEffect } from 'react';
import { CursorOverlay, UserPresence } from './';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Users, Eye, EyeOff } from 'lucide-react';

interface CollaborativeEditorProps {
  documentId: string;
  initialContent?: string;
  currentUserId: string;
  className?: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  initialContent = '',
  currentUserId,
  className = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [showPresence, setShowPresence] = useState(true);
  const [showCursors, setShowCursors] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for content changes
  useEffect(() => {
    if (!documentId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/collaboration/documents/${documentId}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'content_change' && data.user_id !== currentUserId) {
          // Apply the operation to the content
          // For now, just replace the entire content (simplified)
          if (data.operation?.type === 'insert') {
            const pos = data.operation.position || 0;
            const newContent = content.slice(0, pos) + (data.operation.content || '') + content.slice(pos);
            setContent(newContent);
          } else if (data.operation?.type === 'delete') {
            const start = data.operation.position || 0;
            const length = data.operation.length || 0;
            const newContent = content.slice(0, start) + content.slice(start + length);
            setContent(newContent);
          }
        }
      } catch (error) {
        console.error('Error processing content change:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [documentId, currentUserId, content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Send content change to server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/collaboration/documents/${documentId}`;

    // For simplicity, send the entire content change
    // In a real implementation, you'd send operational transforms
    fetch(`/api/v1/collaboration/documents/${documentId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newContent,
        timestamp: Date.now()
      })
    }).catch(console.error);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Collaborative Editor</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={showPresence ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPresence(!showPresence)}
              >
                <Users className="w-4 h-4 mr-2" />
                Presence
              </Button>
              <Button
                variant={showCursors ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCursors(!showCursors)}
              >
                {showCursors ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                Cursors
              </Button>
            </div>
          </div>

          {showPresence && (
            <UserPresence
              documentId={documentId}
              currentUserId={currentUserId}
              compact={true}
              className="hidden md:flex"
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Editor */}
        <div className="lg:col-span-3">
          <Card className="relative">
            <div ref={containerRef} className="relative">
              <Textarea
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                placeholder="Start typing to collaborate in real-time..."
                className="min-h-[400px] resize-none font-mono text-sm"
              />

              {/* Cursor Overlay */}
              {showCursors && (
                <CursorOverlay
                  documentId={documentId}
                  currentUserId={currentUserId}
                  containerRef={containerRef}
                />
              )}
            </div>
          </Card>
        </div>

        {/* User Presence Panel */}
        {showPresence && (
          <div className="lg:col-span-1">
            <UserPresence
              documentId={documentId}
              currentUserId={currentUserId}
              compact={false}
            />
          </div>
        )}
      </div>

      {/* Mobile User Presence */}
      {showPresence && (
        <div className="md:hidden">
          <UserPresence
            documentId={documentId}
            currentUserId={currentUserId}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export default CollaborativeEditor;