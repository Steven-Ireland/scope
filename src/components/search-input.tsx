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
    case 'keyword': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'integer':
    case 'long':
    case 'float':
    case 'double': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'date': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'text': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'boolean': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
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
          setActiveIndex(0);
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
      const matches = fields
        .filter(f =>
          f.name.toLowerCase().startsWith(lastWord.toLowerCase()) && 
          (lastWord === '' || f.name.toLowerCase() !== lastWord.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      if (matches.length > 0) {
        setSuggestions(matches.slice(0, 10).map(f => ({
          label: f.name,
          value: f.name,
          type: f.type,
          kind: 'field'
        })));
        setIsOpen(true);
        setActiveIndex(0);
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
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);

    const words = textBeforeCursor.split(/(\s+)/);
    const lastWord = words[words.length - 1];

    let newTextBefore = '';
    if (suggestion.kind === 'field') {
      newTextBefore = textBeforeCursor.slice(0, -lastWord.length) + suggestion.value + ':';
    } else {
      const [fieldName] = lastWord.split(':');
      newTextBefore = textBeforeCursor.slice(0, -lastWord.length) + fieldName + ':' + suggestion.value + ' ';
    }

    const newValue = newTextBefore + textAfterCursor;
    onChange(newValue);
    
    const newPos = newTextBefore.length;

    if (suggestion.kind === 'field') {
        updateSuggestions(newValue, newPos);
    } else {
        setIsOpen(false);
    }

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      onSearch();
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Tab') {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
        }
      }
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
    if (!isOpen || activeIndex < 0) return '';
    
    const suggestion = suggestions[activeIndex];
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