"use client";

import { Filter, History, Mic, Search, TrendingUp, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
  popularSearches?: string[];
  enableVoiceSearch?: boolean;
  enableFilters?: boolean;
  filterCount?: number;
  onFiltersClick?: () => void;
  className?: string;
  compact?: boolean;
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
}

export function MobileSearch({
  value,
  onChange,
  onSubmit,
  placeholder = "Search...",
  suggestions = [],
  recentSearches = [],
  popularSearches = [],
  enableVoiceSearch = true,
  enableFilters = true,
  filterCount = 0,
  onFiltersClick,
  className,
  compact = false,
}: MobileSearchProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [voiceSearch, setVoiceSearch] = React.useState<VoiceSearchState>({
    isListening: false,
    isSupported: false,
    transcript: "",
    error: null,
  });

  const inputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);

  // Initialize speech recognition
  React.useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onstart = () => {
          setVoiceSearch((prev) => ({
            ...prev,
            isListening: true,
            error: null,
          }));
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join("");

          setVoiceSearch((prev) => ({ ...prev, transcript }));
          onChange(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          setVoiceSearch((prev) => ({
            ...prev,
            isListening: false,
            error: `Voice search error: ${event.error}`,
          }));
        };

        recognitionRef.current.onend = () => {
          setVoiceSearch((prev) => ({ ...prev, isListening: false }));
        };

        setVoiceSearch((prev) => ({ ...prev, isSupported: true }));
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onChange]);

  const startVoiceSearch = React.useCallback(() => {
    if (recognitionRef.current && !voiceSearch.isListening) {
      recognitionRef.current.start();
    }
  }, [voiceSearch.isListening]);

  const stopVoiceSearch = React.useCallback(() => {
    if (recognitionRef.current && voiceSearch.isListening) {
      recognitionRef.current.stop();
    }
  }, [voiceSearch.isListening]);

  const handleSubmit = React.useCallback(
    (searchValue: string) => {
      if (searchValue.trim()) {
        onSubmit?.(searchValue.trim());
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    },
    [onSubmit],
  );

  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      handleSubmit(suggestion);
    },
    [onChange, handleSubmit],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit(value);
      } else if (e.key === "Escape") {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    },
    [value, handleSubmit],
  );

  const clearSearch = React.useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-10 h-10"
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {enableFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFiltersClick}
            className={cn(
              "shrink-0",
              filterCount > 0 &&
                "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
            )}
          >
            <Filter className="h-4 w-4" />
            {filterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-12 pr-24 h-14 text-base rounded-xl border-2 focus:border-blue-500"
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Voice Search */}
          {enableVoiceSearch && voiceSearch.isSupported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                voiceSearch.isListening ? stopVoiceSearch : startVoiceSearch
              }
              className={cn(
                "h-10 w-10 p-0 rounded-lg",
                voiceSearch.isListening &&
                  "bg-red-500 text-white hover:bg-red-600",
              )}
              disabled={voiceSearch.error !== null}
            >
              <Mic
                className={cn(
                  "h-4 w-4",
                  voiceSearch.isListening && "animate-pulse",
                )}
              />
            </Button>
          )}

          {/* Clear Button */}
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-10 w-10 p-0 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Filters Button */}
          {enableFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFiltersClick}
              className={cn(
                "h-10 w-10 p-0 rounded-lg",
                filterCount > 0 && "bg-blue-100 dark:bg-blue-900/30",
              )}
            >
              <Filter className="h-4 w-4" />
              {filterCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {filterCount}
                </div>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Voice Search Status */}
      {voiceSearch.isListening && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <Mic className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Listening...</span>
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-red-500 animate-pulse rounded-full" />
                <div
                  className="w-1 h-4 bg-red-500 animate-pulse rounded-full"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-1 h-4 bg-red-500 animate-pulse rounded-full"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Search Error */}
      {voiceSearch.error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              {voiceSearch.error}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setVoiceSearch((prev) => ({ ...prev, error: null }))
              }
              className="mt-2 text-red-600 dark:text-red-400"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Expanded Search Results/Suggestions */}
      {isExpanded && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            {/* Current Suggestions */}
            {suggestions.length > 0 && value && (
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Search className="h-4 w-4 text-gray-400" />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && !value && (
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <History className="h-4 w-4 text-gray-400" />
                          <span>{search}</span>
                        </div>
                        <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {popularSearches.length > 0 && !value && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Popular Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.slice(0, 8).map((search, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSuggestionClick(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Close overlay when clicking outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

export default MobileSearch;
