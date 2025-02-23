import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
import { Check, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddressAutocompleteProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces?: () => void;
  }
}

export function AddressAutocomplete({ onAddressSelect, className, ...props }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(true); // Start as true to allow input
  const [placesService, setPlacesService] = useState<any>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const initRetryCount = React.useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;

    if (!apiKey) {
      console.error("Google Places API key is missing");
      setFallbackMode(true);
      return;
    }

    if (window.google?.maps?.places) {
      initializePlacesServices();
      return;
    }

    async function initializePlacesServices() {
      try {
        if (!window.google?.maps?.places) {
          throw new Error("Places API not loaded");
        }

        const dummyElement = document.createElement('div');
        const placesServiceInstance = new window.google.maps.places.PlacesService(dummyElement);
        const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();

        setPlacesService(placesServiceInstance);
        setAutocompleteService(autocompleteServiceInstance);
        setIsScriptLoaded(true);
        setFallbackMode(false);
        initRetryCount.current = 0;
      } catch (error) {
        console.error("Failed to initialize Places services:", error);
        if (initRetryCount.current < maxRetries) {
          initRetryCount.current += 1;
          setTimeout(initializePlacesServices, 1000 * initRetryCount.current);
        } else {
          setFallbackMode(true);
        }
      }
    }

    window.initGooglePlaces = initializePlacesServices;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      if (initRetryCount.current < maxRetries) {
        initRetryCount.current += 1;
        setTimeout(() => {
          document.head.appendChild(script);
        }, 1000 * initRetryCount.current);
      } else {
        setFallbackMode(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.initGooglePlaces) {
        delete window.initGooglePlaces;
      }
    };
  }, []);

  const handleSearch = useCallback(async (input: string) => {
    if (!input || !autocompleteService || fallbackMode) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const request = {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address']
      };

      autocompleteService.getPlacePredictions(
        request,
        (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setSuggestions(results);
            setOpen(true);
          } else {
            setSuggestions([]);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Address lookup failed:", error);
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [autocompleteService, fallbackMode]);

  const handleAddressSelect = useCallback(async (placeId: string, description: string) => {
    if (fallbackMode || !placesService) {
      const parts = description.split(',').map(part => part.trim());
      onAddressSelect({
        address: parts[0] || '',
        city: parts[1] || '',
        state: parts[2]?.split(' ')[0] || '',
        zipCode: parts[2]?.split(' ')[1] || ''
      });
      setValue(description);
      setOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      placesService.getDetails(
        {
          placeId,
          fields: ['address_components', 'formatted_address']
        },
        (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const address = {
              address: place.formatted_address || '',
              city: '',
              state: '',
              zipCode: ''
            };

            place.address_components.forEach((component: any) => {
              const type = component.types[0];
              switch (type) {
                case 'locality':
                  address.city = component.long_name;
                  break;
                case 'administrative_area_level_1':
                  address.state = component.short_name;
                  break;
                case 'postal_code':
                  address.zipCode = component.long_name;
                  break;
              }
            });

            onAddressSelect(address);
            setValue(place.formatted_address || description);
            setOpen(false);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error getting address details:", error);
      setIsLoading(false);
    }
  }, [fallbackMode, onAddressSelect, placesService]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            className={cn("pr-8", className)}
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              setValue(newValue);
              if (!fallbackMode) {
                handleSearch(newValue);
              }
            }}
            disabled={false} // Remove the disabled state
            placeholder={fallbackMode ? "Enter full address..." : "Search for an address..."}
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
  );
}

AddressAutocomplete.displayName = "AddressAutocomplete";