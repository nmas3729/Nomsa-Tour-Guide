"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ComboboxOption = { value: string; label: string };

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Choose an option",
  searchLabel = "Search options",
}: {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const selected = options.find((option) => option.value === value);
  const listboxId = "combobox-options";
  const activeOptionId = filtered[activeIndex] ? `${listboxId}-${activeIndex}` : undefined;

  function selectOption(option: ComboboxOption) {
    onValueChange(option.value);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={selected?.label ?? placeholder}
          className="w-full justify-between rounded-xl border border-input bg-background px-3 text-left font-normal"
          type="button"
          variant="outline"
        >
          {selected?.label ?? placeholder}
          <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div>
          <Input
            ref={searchRef}
            aria-label={searchLabel}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            role="combobox"
            className="mb-2"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && filtered[activeIndex]) {
                event.preventDefault();
                selectOption(filtered[activeIndex]);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            value={query}
          />
          <div aria-label="Options" className="max-h-56 overflow-y-auto" id={listboxId} role="listbox">
            {filtered.length ? filtered.map((option, index) => (
                <button
                  id={`${listboxId}-${index}`}
                  aria-selected={option.value === value}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => selectOption(option)}
                  onMouseMove={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                  key={option.value}
                >
                  {option.label}
                  {option.value === value ? <Check aria-hidden="true" size={15} /> : null}
                </button>
            )) : <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
