/**
 * VersionHistory component for displaying and managing document versions
 */

import { formatDistanceToNow } from "date-fns";
import { Eye, History, RotateCcw } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";

interface Version {
  version_id: string;
  created_by: string;
  created_at: string;
  parent_version?: string;
  metadata?: Record<string, any>;
}

interface VersionHistoryProps {
  documentId: string;
  onVersionSelect?: (versionId: string) => void;
  onRevert?: (versionId: string) => void;
  className?: string;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  documentId,
  onVersionSelect,
  onRevert,
  className = "",
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(
        `/api/v1/collaboration/documents/${documentId}/versions`,
      );
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = async (versionId: string) => {
    setSelectedVersion(versionId);
    if (onVersionSelect) {
      try {
        const response = await fetch(
          `/api/v1/collaboration/documents/${documentId}/versions/${versionId}`,
        );
        if (response.ok) {
          const data = await response.json();
          onVersionSelect(data.content);
        }
      } catch (error) {
        console.error("Error fetching version:", error);
      }
    }
  };

  const handleRevert = async (versionId: string) => {
    if (
      !confirm(
        "Are you sure you want to revert to this version? This will create a new version.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/collaboration/documents/${documentId}/versions/${versionId}/revert`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (onRevert) {
          onRevert(data.content);
        }
        // Refresh versions
        fetchVersions();
      }
    } catch (error) {
      console.error("Error reverting version:", error);
    }
  };

  const getVersionType = (version: Version) => {
    if (version.metadata?.type === "revert") {
      return "revert";
    }
    if (version.metadata?.conflict_resolved) {
      return "conflict";
    }
    return "edit";
  };

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case "revert":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "conflict":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Version History ({versions.length})
        </h3>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-3">
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No versions found
              </p>
            </div>
          ) : (
            versions.map((version, index) => {
              const versionType = getVersionType(version);
              const isSelected = selectedVersion === version.version_id;

              return (
                <div
                  key={version.version_id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getVersionBadgeColor(versionType)}`}
                        >
                          {versionType}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        by {version.created_by}
                      </p>

                      {version.metadata?.reverted_from && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Reverted from version{" "}
                          {version.metadata.reverted_from.slice(-8)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVersionSelect(version.version_id)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevert(version.version_id)}
                          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default VersionHistory;
