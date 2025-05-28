
"use client";
import { useState, type FormEvent, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, X } from 'lucide-react'; // Added X for clearing

interface Suggestion {
  value: string;
  type: 'skill' | 'designation' | 'company' | 'location';
}

interface JobSearchBarProps {
  onSearch: (searchParams: { searchTerm: string; experience: string; location: string }) => void;
}

const experienceLevels = [
  "Fresher",
  "1-2 Years",
  "2-3 Years",
  "3-5 Years",
  "5-7 Years",
  "7-10 Years",
  "10+ Years",
];

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

export function JobSearchBar({ onSearch }: JobSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');

  const [termSuggestions, setTermSuggestions] = useState<Suggestion[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<Suggestion[]>([]);
  
  const [isTermSuggestionsVisible, setIsTermSuggestionsVisible] = useState(false);
  const [isLocationSuggestionsVisible, setIsLocationSuggestionsVisible] = useState(false);

  const searchTermRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const termSuggestionsRef = useRef<HTMLUListElement>(null);
  const locationSuggestionsRef = useRef<HTMLUListElement>(null);


  const fetchSuggestions = async (query: string, type: 'general' | 'locations'): Promise<Suggestion[]> => {
    if (query.trim().length < 2) return [];
    try {
      const response = await fetch(`/api/search-suggestions?query=${encodeURIComponent(query)}&type=${type}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      return [];
    }
  };

  const debouncedFetchTermSuggestions = useCallback(debounce(fetchSuggestions, 300), []);
  const debouncedFetchLocationSuggestions = useCallback(debounce(fetchSuggestions, 300), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termSuggestionsRef.current && !termSuggestionsRef.current.contains(event.target as Node) &&
          searchTermRef.current && !searchTermRef.current.contains(event.target as Node)) {
        setIsTermSuggestionsVisible(false);
      }
      if (locationSuggestionsRef.current && !locationSuggestionsRef.current.contains(event.target as Node) &&
          locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setIsLocationSuggestionsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSearchTermChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    if (query.trim().length < 2) {
      setTermSuggestions([]);
      setIsTermSuggestionsVisible(false);
      return;
    }
    const suggestions = await debouncedFetchTermSuggestions(query, 'general');
    setTermSuggestions(suggestions);
    setIsTermSuggestionsVisible(suggestions.length > 0);
  };

  const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocation(query);
    if (query.trim().length < 2) {
      setLocationSuggestions([]);
      setIsLocationSuggestionsVisible(false);
      return;
    }
    const suggestions = await debouncedFetchLocationSuggestions(query, 'locations');
    setLocationSuggestions(suggestions);
    setIsLocationSuggestionsVisible(suggestions.length > 0);
  };

  const handleSuggestionClick = (suggestion: Suggestion, type: 'term' | 'location') => {
    if (type === 'term') {
      setSearchTerm(suggestion.value);
      setTermSuggestions([]);
      setIsTermSuggestionsVisible(false);
      searchTermRef.current?.focus();
    } else {
      setLocation(suggestion.value);
      setLocationSuggestions([]);
      setIsLocationSuggestionsVisible(false);
      locationRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsTermSuggestionsVisible(false);
    setIsLocationSuggestionsVisible(false);
    onSearch({ searchTerm, experience, location });
  };
  
  const clearSearchTerm = () => {
    setSearchTerm('');
    setTermSuggestions([]);
    setIsTermSuggestionsVisible(false);
    searchTermRef.current?.focus();
  };

  const clearLocation = () => {
    setLocation('');
    setLocationSuggestions([]);
    setIsLocationSuggestionsVisible(false);
    locationRef.current?.focus();
  };


  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-3 bg-card p-3 rounded-xl shadow-lg border relative">
      {/* Search Term Input with Suggestions */}
      <div className="relative flex-grow flex items-center">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchTermRef}
          type="text"
          placeholder="Skills, designations, companies"
          value={searchTerm}
          onChange={handleSearchTermChange}
          onFocus={() => setIsTermSuggestionsVisible(termSuggestions.length > 0 && searchTerm.length > 0)}
          className="pl-10 pr-8 h-11 text-sm border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {searchTerm && (
          <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={clearSearchTerm}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {isTermSuggestionsVisible && termSuggestions.length > 0 && (
          <ul ref={termSuggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-lg rounded-md z-10 max-h-60 overflow-y-auto">
            {termSuggestions.map((s, index) => (
              <li
                key={`${s.type}-${s.value}-${index}`}
                onClick={() => handleSuggestionClick(s, 'term')}
                className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              >
                {s.value} <span className="text-xs text-muted-foreground ml-1">({s.type})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Experience Select */}
      <Select value={experience} onValueChange={(value) => {
        // Map "fresher" to "entry-level" for better API compatibility
        if (value === "fresher") {
          setExperience("Entry-level");
        } else {
          // For other values, we might need a more complex mapping or ensure API handles them
          // For now, pass them as is, or map known ones.
          // Example: if (value === "1-2-years") setExperience("Entry-level"); // or some other logic
          setExperience(value);
        }
      }}>
        <SelectTrigger className="h-11 text-sm border-none focus:ring-0 focus:ring-offset-0 w-auto min-w-[150px] text-muted-foreground">
          <SelectValue placeholder="Select experience" />
        </SelectTrigger>
        <SelectContent>
          {experienceLevels.map((level) => {
            let value = level.toLowerCase().replace(/[^a-z0-9+]/gi, '-');
            // If the display level is "Fresher", the value sent (if not mapped above) would be "fresher".
            // The onValueChange handler now maps "fresher" to "Entry-level".
            return (
              <SelectItem key={level} value={value}>
                {level}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6" />

      {/* Location Input with Suggestions */}
      <div className="relative flex-grow flex items-center">
         <Input
          ref={locationRef}
          type="text"
          placeholder="Enter location"
          value={location}
          onChange={handleLocationChange}
          onFocus={() => setIsLocationSuggestionsVisible(locationSuggestions.length > 0 && location.length > 0)}
          className="h-11 text-sm border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-8"
        />
        {location && (
          <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={clearLocation}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {isLocationSuggestionsVisible && locationSuggestions.length > 0 && (
          <ul ref={locationSuggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-lg rounded-md z-10 max-h-60 overflow-y-auto">
            {locationSuggestions.map((s, index) => (
              <li
                key={`${s.type}-${s.value}-${index}`}
                onClick={() => handleSuggestionClick(s, 'location')}
                className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              >
                {s.value}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <Button type="submit" size="lg" className="h-11 px-6 rounded-lg">
        Search
      </Button>
    </form>
  );
}
