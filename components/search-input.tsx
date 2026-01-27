'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  index: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchInput({ value, onChange, onSearch, index, placeholder, disabled }: SearchInputProps) {
  const [fields, setFields] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!index) return;
    fetch(`/api/fields?index=${index}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setFields(data);
        }
      })
      .catch(err => console.error('Error fetching fields:', err));
  }, [index]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    // Split by spaces but keep delimiters to reconstruct properly if needed,
    // though here we just need the last chunk.
    const words = textBeforeCursor.split(/(\s+)/); 
    const lastWord = words[words.length - 1];

    // If we are typing a space, or empty, don't suggest
    if (!lastWord || !lastWord.trim()) {
        setIsOpen(false);
        return;
    }

    // Filter fields that start with the last word
    const matches = fields.filter(f => 
        f.toLowerCase().startsWith(lastWord.toLowerCase()) && f.toLowerCase() !== lastWord.toLowerCase()
    );

    if (matches.length > 0) {
        setSuggestions(matches.slice(0, 10));
        setIsOpen(true);
        setActiveIndex(0);
    } else {
        setIsOpen(false);
    }
  };
  
  const selectSuggestion = (suggestion: string) => {
      const cursorPosition = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPosition);
      const textAfterCursor = value.slice(cursorPosition);
      
      const words = textBeforeCursor.split(/(\s+)/);
      const lastWord = words[words.length - 1];
      
      // Replace only the last word
      const newTextBefore = textBeforeCursor.slice(0, -lastWord.length) + suggestion + ':';
      
      const newValue = newTextBefore + textAfterCursor;
      onChange(newValue);
      setIsOpen(false);
      
      // We need to wait a tick for the input value to update before setting focus/selection?
      // Actually React state update might be enough. 
      // We want to keep focus on input.
      setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOpen) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex(i => (i + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (activeIndex >= 0 && activeIndex < suggestions.length) {
                  selectSuggestion(suggestions[activeIndex]);
              }
          } else if (e.key === 'Escape') {
              setIsOpen(false);
          } else if (e.key === 'Tab') {
              e.preventDefault();
              if (activeIndex >= 0 && activeIndex < suggestions.length) {
                  selectSuggestion(suggestions[activeIndex]);
              }
          }
      } else {
          if (e.key === 'Enter') {
              onSearch();
          }
      }
  };

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
        <Input 
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
        />
        {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden animate-in fade-in-0 zoom-in-95">
                <ul className="py-1 max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <li 
                            key={suggestion}
                            className={`px-3 py-2 text-sm cursor-pointer ${index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                            onClick={() => selectSuggestion(suggestion)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
}
