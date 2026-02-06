'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useConfigStore } from '@/store/use-config-store';

interface Field {
  name: string;
  type: string;
}

interface Suggestion {
  label: string;
  value: string;
  type?: string;
  kind: 'field' | 'value';
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  index: string;
  placeholder?: string;
  disabled?: boolean;
}

const getTypeColor = (type?: string) => {
  switch (type) {
    case 'keyword': return 'bg-nord9/10 text-nord9 border-nord9/20';
    case 'integer':
    case 'long':
    case 'float':
    case 'double': return 'bg-nord14/10 text-nord14 border-nord14/20';
    case 'date': return 'bg-nord13/10 text-nord13 border-nord13/20';
    case 'text': return 'bg-nord12/10 text-nord12 border-nord12/20';
    case 'boolean': return 'bg-nord15/10 text-nord15 border-nord15/20';
    default: return 'bg-nord3/10 text-nord4 border-nord3/20';
  }
};

export function SearchInput({ value, onChange, onSearch, index, placeholder, disabled }: SearchInputProps) {
  const [fields, setFields] = React.useState<Field[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastRequestRef = React.useRef<number>(0);
  const currentValueRef = React.useRef(value);

  // Keep the ref in sync with the value prop
  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);
  
  const getActiveServer = useConfigStore(state => state.getActiveServer);
  const activeServer = React.useMemo(() => getActiveServer(), [getActiveServer]);

  React.useEffect(() => {
    if (!index || !activeServer) return;
    apiClient.getFields(index, activeServer)
      .then(data => {
        if (Array.isArray(data)) {
          setFields(data);
        }
      })
      .catch(err => console.error('Error fetching fields:', err));
  }, [index, activeServer]);

  const updateSuggestions = React.useCallback(async (text: string, cursorPosition: number) => {
    if (!activeServer) return;
    
    const requestId = ++lastRequestRef.current;
    
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    
    const isAtWordEnd = textAfterCursor.length === 0 || /^\s/.test(textAfterCursor);
    
    if (!isAtWordEnd) {
      setIsOpen(false);
      return;
    }

    const words = textBeforeCursor.split(/(\s+)/);
    const lastWord = words[words.length - 1];

    if (lastWord.includes(':')) {
      const [fieldName, ...valueParts] = lastWord.split(':');
      const valuePrefix = valueParts.join(':');
      const fieldType = fields.find(f => f.name === fieldName)?.type;
      
      try {
        const values = await apiClient.getValues({ 
          index, 
          field: fieldName, 
          query: valuePrefix, 
          type: fieldType || '' 
        }, activeServer);
        
        if (requestId !== lastRequestRef.current) return;

        if (Array.isArray(values) && values.length > 0) {
          setSuggestions(values.map(v => ({
            label: String(v),
            value: String(v),
            kind: 'value'
          })));
          setIsOpen(true);
          setActiveIndex(-1);
        } else {
          setIsOpen(false);
        }
      } catch (err) {
        if (requestId === lastRequestRef.current) {
          console.error('Error fetching values:', err);
          setIsOpen(false);
        }
      }
    } else {
      const search = lastWord.toLowerCase();
      const matches = fields
        .filter(f => {
          const name = f.name.toLowerCase();
          if (search === '') return true;
          if (name === search) return false;
          
          // Smart matching: 
          // 1. Starts with query
          // 2. Any segment (split by dot) starts with query
          if (name.startsWith(search)) return true;
          const segments = name.split('.');
          return segments.some(segment => segment.startsWith(search));
        })
        .sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          // Prioritize exact prefix match
          const aStarts = aName.startsWith(search);
          const bStarts = bName.startsWith(search);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Then prioritize segment prefix match
          const aSegmentStarts = aName.split('.').some(s => s.startsWith(search));
          const bSegmentStarts = bName.split('.').some(s => s.startsWith(search));
          if (aSegmentStarts && !bSegmentStarts) return -1;
          if (!aSegmentStarts && bSegmentStarts) return 1;

          return aName.localeCompare(bName);
        });

      if (matches.length > 0) {
        setSuggestions(matches.slice(0, 10).map(f => ({
          label: f.name,
          value: f.name,
          type: f.type,
          kind: 'field'
        })));
        setIsOpen(true);
        setActiveIndex(-1);
      } else {
        setIsOpen(false);
      }
    }
  }, [index, fields, activeServer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    onChange(newValue);
    updateSuggestions(newValue, cursorPosition);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = currentValueRef.current.slice(0, cursorPosition);
    const textAfterCursor = currentValueRef.current.slice(cursorPosition);

    // Split by whitespace to find the last word. 
    // We use a regex that matches whitespace but keeps it in the result if we wanted, 
    // but here we just want to know where the last word starts.
    const lastWhitespaceIndex = textBeforeCursor.search(/\s\S*$/);
    const lastWordStart = lastWhitespaceIndex === -1 ? 0 : lastWhitespaceIndex + 1;
    const lastWord = textBeforeCursor.slice(lastWordStart);

    let newTextBefore = '';
    if (suggestion.kind === 'field') {
      // Replace the last word (or empty string if at a space) with the field name
      const prefix = textBeforeCursor.slice(0, lastWordStart);
      newTextBefore = prefix + suggestion.value + ':';
    } else {
      // Replace the value part of field:value with the selected value
      const [fieldName] = lastWord.split(':');
      const prefix = textBeforeCursor.slice(0, lastWordStart);
      newTextBefore = prefix + fieldName + ':' + suggestion.value + ' ';
    }

    const newValue = newTextBefore + textAfterCursor;
    onChange(newValue);
    
    const newPos = newTextBefore.length;

    if (suggestion.kind === 'field') {
        updateSuggestions(newValue, newPos);
    } else {
        setIsOpen(false);
    }

    // Use requestAnimationFrame to ensure the DOM has updated and the cursor can be set correctly
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % suggestions.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      } else if (e.key === 'Tab') {
        if (suggestions.length > 0) {
          e.preventDefault();
          const indexToSelect = activeIndex >= 0 ? activeIndex : 0;
          selectSuggestion(suggestions[indexToSelect]);
          return;
        }
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      setIsOpen(false);
      onSearch();
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCursorMove = (e: React.MouseEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    updateSuggestions(target.value, target.selectionStart || 0);
  };

  const ghostText = React.useMemo(() => {
    if (!isOpen || (activeIndex < 0 && suggestions.length === 0)) return '';
    
    const suggestion = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
    if (!suggestion) return '';
    
    const cursorPosition = inputRef.current?.selectionStart || 0;
    
    // Only show ghost text if cursor is at the end of the text
    if (cursorPosition !== value.length) return '';

    const textBeforeCursor = value.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/(\s+)/);
    const lastWord = words[words.length - 1];

    if (suggestion.kind === 'field') {
      if (suggestion.value.toLowerCase().startsWith(lastWord.toLowerCase())) {
        return suggestion.value.slice(lastWord.length) + ':';
      }
    } else {
      const [fieldName, ...valueParts] = lastWord.split(':');
      const valuePrefix = valueParts.join(':');
      if (suggestion.value.toLowerCase().startsWith(valuePrefix.toLowerCase())) {
        return suggestion.value.slice(valuePrefix.length) + ' ';
      }
    }
    
    return '';
  }, [isOpen, activeIndex, suggestions, value]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={handleCursorMove}
        onFocus={(e) => {
          setIsFocused(true);
          updateSuggestions(e.target.value, e.target.selectionStart || 0);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onKeyUp={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            handleCursorMove(e);
          }
          if (['ArrowUp', 'ArrowDown'].includes(e.key) && !isOpen) {
            handleCursorMove(e);
          }
        }}
        placeholder={isFocused ? "" : placeholder}
        disabled={disabled}
        autoComplete="off"
        className="font-mono relative z-10 bg-transparent dark:bg-transparent"
      />
      {ghostText && (
        <div 
          className="absolute inset-0 px-3 py-1 text-base md:text-sm font-mono flex items-center pointer-events-none z-0"
          aria-hidden="true"
        >
          <span className="opacity-0 whitespace-pre">{value}</span>
          <span className="text-muted-foreground/50 whitespace-pre">{ghostText}</span>
        </div>
      )}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden animate-in fade-in-0 zoom-in-95">
          <ul className="py-1 max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.kind}-${suggestion.value}-${index}`}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer flex items-center justify-between",
                  index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={suggestion.kind === 'value' ? 'font-medium' : 'font-mono'}>
                  {suggestion.label}
                </span>
                {suggestion.kind === 'field' && (
                  <span className={cn(
                    "ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border",
                    getTypeColor(suggestion.type)
                  )}>
                    {suggestion.type}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}