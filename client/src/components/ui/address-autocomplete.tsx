import * as React from "react";
import { useState } from "react";
import { Input } from "./input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/lib/utils";
import { Check, Loader2, MapPin, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";

interface AddressAutocompleteProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
}

interface AddressSearchResult {
  description: string;
  place_id: string;
}

export function AddressAutocomplete({ onAddressSelect, className, ...props }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (input: string) => {
    if (!input) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Searching for address:", input);

      const response = await fetch(`/api/places/search?q=${encodeURIComponent(input)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Search failed:", data);
        throw new Error(data.error || `Search failed: ${response.statusText}`);
      }

      console.log("Search results:", data);
      setSuggestions(data);
      setOpen(true);
    } catch (error) {
      console.error("Address search failed:", error);
      setError("Failed to search for addresses. Please try again or enter manually.");
      toast({
        title: "Search Error",
        description: "Unable to find address suggestions. Please try again.",
        variant: "destructive",
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = async (placeId: string, description: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Getting details for place:", placeId);

      const response = await fetch(`/api/places/${placeId}/details`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Details fetch failed:", data);
        throw new Error(data.error || `Failed to get details: ${response.statusText}`);
      }

      console.log("Place details:", data);
      onAddressSelect(data);
      setValue(description);
      setOpen(false);
    } catch (error) {
      console.error("Failed to get address details:", error);
      setError("Failed to get address details. Please try again or enter manually.");
      toast({
        title: "Error",
        description: "Failed to get address details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              className={cn("pr-8", className)}
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                setValue(newValue);
                handleSearch(newValue);
              }}
              placeholder="Search for an address..."
              {...props}
            />
            {isLoading ? (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            {suggestions.length === 0 ? (
              <CommandEmpty>No addresses found</CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.place_id}
                    value={suggestion.description}
                    onSelect={() => handleAddressSelect(suggestion.place_id, suggestion.description)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion.description ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {suggestion.description}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

AddressAutocomplete.displayName = "AddressAutocomplete";