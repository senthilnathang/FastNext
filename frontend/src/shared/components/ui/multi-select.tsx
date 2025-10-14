"use client";

import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type OptionType = {
  label: string;
  value: string;
};

export type MultiSelectElement = React.ComponentRef<typeof Popover>;
export type MultiSelectProps = React.ComponentProps<typeof Popover> & {
  options: OptionType[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
};
function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select items...",
  ...props
}: MultiSelectProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = React.useCallback(
    (item: string) => {
      onChange((prev) => prev.filter((i) => i !== item));
    },
    [onChange],
  );

  const handleSelect = React.useCallback(
    (value: string) => {
      onChange((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value],
      );
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            selected.length > 0 && "h-auto",
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mb-1 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {options.find((o) => o.value === item)?.label}
                  <XIcon className="ml-1 size-3 text-muted-foreground hover:text-foreground" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className={className}>
          <CommandInput placeholder="Search ..." />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <CheckIcon
                  className={cn(
                    " size-4",
                    selected.includes(option.value)
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
