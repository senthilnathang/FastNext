/**
 * Global Content Manager - Multi-language content creation and management
 */

import { Eye, Globe, Languages, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

interface ContentItem {
  id: string;
  key: string;
  translations: Record<
    string,
    {
      value: string;
      lastModified: string;
      modifiedBy: string;
      status: "draft" | "published" | "archived";
    }
  >;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface GlobalContentManagerProps {
  contentType?: "text" | "html" | "markdown";
  categories?: string[];
  supportedLocales?: string[];
  onContentChange?: (content: ContentItem) => void;
  className?: string;
}

const DEFAULT_LOCALES = ["en", "es", "fr", "de", "ar", "zh", "ja", "ko"];
const DEFAULT_CATEGORIES = ["ui", "content", "marketing", "legal", "help"];

export const GlobalContentManager: React.FC<GlobalContentManagerProps> = ({
  contentType = "text",
  categories = DEFAULT_CATEGORIES,
  supportedLocales = DEFAULT_LOCALES,
  onContentChange,
  className = "",
}) => {
  const { t: _t, locale: currentLocale } = useTranslation();

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>(currentLocale);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newContentKey, setNewContentKey] = useState("");

  // Load content items (in production, fetch from API)
  useEffect(() => {
    const loadContent = async () => {
      // Mock data - in production, fetch from API
      const mockContent: ContentItem[] = [
        {
          id: "1",
          key: "welcome.title",
          category: "ui",
          tags: ["greeting", "homepage"],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
          translations: {
            en: {
              value: "Welcome to FastNext",
              lastModified: "2024-01-15T00:00:00Z",
              modifiedBy: "admin",
              status: "published",
            },
            es: {
              value: "Bienvenido a FastNext",
              lastModified: "2024-01-14T00:00:00Z",
              modifiedBy: "translator",
              status: "published",
            },
            fr: {
              value: "Bienvenue sur FastNext",
              lastModified: "2024-01-13T00:00:00Z",
              modifiedBy: "translator",
              status: "published",
            },
          },
        },
        {
          id: "2",
          key: "nav.dashboard",
          category: "ui",
          tags: ["navigation"],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-10T00:00:00Z",
          translations: {
            en: {
              value: "Dashboard",
              lastModified: "2024-01-10T00:00:00Z",
              modifiedBy: "admin",
              status: "published",
            },
          },
        },
      ];
      setContentItems(mockContent);
    };

    loadContent();
  }, []);

  const filteredContent = contentItems.filter((item) => {
    const matchesSearch =
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(item.translations).some((t) =>
        t.value.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateContent = useCallback(() => {
    if (!newContentKey.trim()) return;

    const newItem: ContentItem = {
      id: Date.now().toString(),
      key: newContentKey,
      category: "ui",
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      translations: {},
    };

    setContentItems((prev) => [...prev, newItem]);
    setSelectedItem(newItem);
    setNewContentKey("");
    setIsCreating(false);
  }, [newContentKey]);

  const handleUpdateTranslation = useCallback(
    (locale: string, value: string) => {
      if (!selectedItem) return;

      const updatedItem = {
        ...selectedItem,
        translations: {
          ...selectedItem.translations,
          [locale]: {
            value,
            lastModified: new Date().toISOString(),
            modifiedBy: "current_user", // In production, get from auth
            status: "draft" as const,
          },
        },
        updatedAt: new Date().toISOString(),
      };

      setContentItems((prev) =>
        prev.map((item) => (item.id === selectedItem.id ? updatedItem : item)),
      );
      setSelectedItem(updatedItem);
      onContentChange?.(updatedItem);
    },
    [selectedItem, onContentChange],
  );

  const handlePublishTranslation = useCallback(
    (locale: string) => {
      if (!selectedItem) return;

      const updatedItem = {
        ...selectedItem,
        translations: {
          ...selectedItem.translations,
          [locale]: {
            ...selectedItem.translations[locale],
            status: "published" as const,
            lastModified: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };

      setContentItems((prev) =>
        prev.map((item) => (item.id === selectedItem.id ? updatedItem : item)),
      );
      setSelectedItem(updatedItem);
    },
    [selectedItem],
  );

  const handleCopyTranslation = useCallback(
    (fromLocale: string, toLocale: string) => {
      if (!selectedItem || !selectedItem.translations[fromLocale]) return;

      handleUpdateTranslation(
        toLocale,
        selectedItem.translations[fromLocale].value,
      );
    },
    [selectedItem, handleUpdateTranslation],
  );

  const getTranslationStatus = (item: ContentItem, locale: string) => {
    const translation = item.translations[locale];
    if (!translation) return "missing";
    return translation.status;
  };

  const getCompletionPercentage = (item: ContentItem) => {
    const translated = supportedLocales.filter(
      (locale) => item.translations[locale],
    ).length;
    return Math.round((translated / supportedLocales.length) * 100);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Global Content Manager</h1>
              <p className="text-muted-foreground">
                Manage multi-language content across all supported locales
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Content
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content List */}
        <Card className="lg:col-span-1 p-4">
          <div className="space-y-4">
            {/* Filters */}
            <div className="space-y-3">
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredContent.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.key}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getCompletionPercentage(item)}% translated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Translation status indicators */}
                  <div className="flex gap-1 mt-2">
                    {supportedLocales.slice(0, 6).map((locale) => {
                      const status = getTranslationStatus(item, locale);
                      return (
                        <div
                          key={locale}
                          className={`w-2 h-2 rounded-full ${
                            status === "published"
                              ? "bg-green-500"
                              : status === "draft"
                                ? "bg-yellow-500"
                                : "bg-gray-300"
                          }`}
                          title={`${locale.toUpperCase()}: ${status}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Content Editor */}
        <Card className="lg:col-span-2 p-6">
          {isCreating ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Create New Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Content Key</label>
                  <Input
                    value={newContentKey}
                    onChange={(e) => setNewContentKey(e.target.value)}
                    placeholder="e.g., welcome.title"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateContent}
                    disabled={!newContentKey.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedItem ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedItem.key}</h2>
                  <p className="text-muted-foreground">
                    Category: {selectedItem.category}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  {supportedLocales.slice(0, 4).map((locale) => (
                    <TabsTrigger
                      key={locale}
                      value={locale}
                      className="text-xs"
                    >
                      {locale.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {supportedLocales.map((locale) => (
                  <TabsContent
                    key={locale}
                    value={locale}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        <span className="font-medium">
                          {locale.toUpperCase()} Translation
                        </span>
                        {selectedItem.translations[locale] && (
                          <Badge
                            variant={
                              selectedItem.translations[locale].status ===
                              "published"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {selectedItem.translations[locale].status}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {selectedItem.translations[locale] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublishTranslation(locale)}
                            disabled={
                              selectedItem.translations[locale].status ===
                              "published"
                            }
                          >
                            Publish
                          </Button>
                        )}

                        {/* Copy from other locales */}
                        <Select
                          onValueChange={(fromLocale) =>
                            handleCopyTranslation(fromLocale, locale)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Copy from" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedLocales
                              .filter(
                                (l) =>
                                  l !== locale && selectedItem.translations[l],
                              )
                              .map((l) => (
                                <SelectItem key={l} value={l}>
                                  {l.toUpperCase()}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {contentType === "text" ? (
                      <Textarea
                        value={selectedItem.translations[locale]?.value || ""}
                        onChange={(e) =>
                          handleUpdateTranslation(locale, e.target.value)
                        }
                        placeholder={`Enter ${locale.toUpperCase()} translation...`}
                        className="min-h-32"
                      />
                    ) : (
                      <Textarea
                        value={selectedItem.translations[locale]?.value || ""}
                        onChange={(e) =>
                          handleUpdateTranslation(locale, e.target.value)
                        }
                        placeholder={`Enter ${locale.toUpperCase()} ${contentType} content...`}
                        className="min-h-48 font-mono text-sm"
                      />
                    )}

                    {selectedItem.translations[locale] && (
                      <div className="text-xs text-muted-foreground">
                        Last modified:{" "}
                        {new Date(
                          selectedItem.translations[locale].lastModified,
                        ).toLocaleString()}
                        by {selectedItem.translations[locale].modifiedBy}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Content Selected</h3>
              <p className="text-muted-foreground">
                Select a content item from the list to start editing
                translations
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GlobalContentManager;
