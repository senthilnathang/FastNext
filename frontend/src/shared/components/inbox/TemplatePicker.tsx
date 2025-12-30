"use client";

/**
 * TemplatePicker Component
 *
 * A message template selection component with template cards grid,
 * search functionality, preview, and category filtering.
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  Eye,
  FileText,
  Filter,
  Search,
  Tag,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/utils";

export interface MessageTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  category?: string;
  tags?: string[];
  description?: string;
  variables?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isDefault?: boolean;
}

export interface TemplatePickerProps {
  /** Available templates */
  templates: MessageTemplate[];
  /** Available categories for filtering */
  categories?: string[];
  /** Callback when a template is selected */
  onSelect?: (template: MessageTemplate) => void;
  /** Callback when use template is confirmed */
  onUseTemplate?: (template: MessageTemplate) => void;
  /** Trigger element */
  trigger?: React.ReactNode;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** CSS class name */
  className?: string;
}

export function TemplatePicker({
  templates,
  categories = [],
  onSelect,
  onUseTemplate,
  trigger,
  disabled = false,
  title = "Message Templates",
  description = "Choose a template to use for your message",
  className,
}: TemplatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = React.useState<MessageTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MessageTemplate | null>(null);

  // Get unique categories from templates if not provided
  const allCategories = React.useMemo(() => {
    if (categories.length > 0) return categories;
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [templates, categories]);

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    let result = templates;

    // Filter by category
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.subject?.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [templates, selectedCategory, searchQuery]);

  // Handle template selection
  const handleSelect = React.useCallback(
    (template: MessageTemplate) => {
      setSelectedTemplate(template);
      onSelect?.(template);
    },
    [onSelect]
  );

  // Handle use template confirmation
  const handleUseTemplate = React.useCallback(() => {
    if (selectedTemplate) {
      onUseTemplate?.(selectedTemplate);
      setOpen(false);
    }
  }, [selectedTemplate, onUseTemplate]);

  // Reset state when dialog closes
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      setSelectedCategory(null);
      setPreviewTemplate(null);
      setSelectedTemplate(null);
    }
  }, []);

  // Close preview
  const handleClosePreview = React.useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild disabled={disabled}>
        {trigger || (
          <Button variant="outline" size="sm" className={cn("gap-2", className)} disabled={disabled}>
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </Button>
        )}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%]",
            "flex max-h-[85vh] flex-col rounded-lg border bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4 border-b px-6 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category filter */}
            {allCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant={selectedCategory === null ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {allCategories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Templates grid */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No templates found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term"
                      : "No templates available in this category"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedTemplate?.id === template.id &&
                          "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => handleSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="line-clamp-1 text-sm">
                            {template.name}
                          </CardTitle>
                          {selectedTemplate?.id === template.id && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </div>
                        {template.category && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            {template.category}
                          </span>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        {template.subject && (
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Subject: {template.subject}
                          </p>
                        )}
                        <CardDescription className="line-clamp-2 text-xs">
                          {template.description || template.content}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <div className="flex w-full items-center justify-between">
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {template.tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{template.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found
            </p>
            <div className="flex gap-2">
              <DialogPrimitive.Close asChild>
                <Button variant="outline">Cancel</Button>
              </DialogPrimitive.Close>
              <Button
                onClick={handleUseTemplate}
                disabled={!selectedTemplate}
              >
                Use Template
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {/* Preview modal */}
      {previewTemplate && (
        <DialogPrimitive.Root open={!!previewTemplate} onOpenChange={handleClosePreview}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className={cn(
                "fixed inset-0 z-[60] bg-black/50",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              )}
            />
            <DialogPrimitive.Content
              className={cn(
                "fixed left-[50%] top-[50%] z-[60] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]",
                "rounded-lg border bg-background p-6 shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <DialogPrimitive.Title className="text-lg font-semibold">
                    {previewTemplate.name}
                  </DialogPrimitive.Title>
                  {previewTemplate.category && (
                    <span className="text-sm text-muted-foreground">
                      {previewTemplate.category}
                    </span>
                  )}
                </div>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <div className="mt-4 space-y-4">
                {previewTemplate.subject && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Subject
                    </p>
                    <p className="mt-1 text-sm">{previewTemplate.subject}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Content
                  </p>
                  <div className="mt-2 max-h-[300px] overflow-auto rounded-md border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {previewTemplate.content}
                    </pre>
                  </div>
                </div>

                {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Variables
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewTemplate.variables.map((variable) => (
                        <span
                          key={variable}
                          className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={handleClosePreview}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleSelect(previewTemplate);
                    handleClosePreview();
                  }}
                >
                  Select Template
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </DialogPrimitive.Root>
  );
}

export default TemplatePicker;
