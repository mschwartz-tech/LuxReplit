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
    google: typeof google;
    initGooglePlaces?: () => void;
  }
}

export function AddressAutocomplete({ onAddressSelect, className, ...props }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Initialize Google Maps Places API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;

    if (!apiKey) {
      console.warn("Google Places API key is missing");
      setFallbackMode(true);
      return;
    }

    // Skip if already loaded
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      initializePlacesServices();
      return;
    }

    // Initialize services
    function initializePlacesServices() {
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
      } catch (error) {
        console.error("Failed to initialize Places services:", error);
        setFallbackMode(true);
      }
    }

    try {
      // Define the callback before creating the script
      window.initGooglePlaces = () => {
        initializePlacesServices();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        console.error("Failed to load Google Maps script");
        setFallbackMode(true);
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
    } catch (error) {
      console.error("Error setting up Places API:", error);
      setFallbackMode(true);
    }
  }, []);

  useEffect(() => {
    // Show appropriate toast message when mode changes
    if (fallbackMode) {
      toast({
        title: "Address Lookup Mode",
        description: "Using manual address input. You can type the full address.",
        variant: "default"
      });
    } else if (isScriptLoaded && placesService && autocompleteService) {
      toast({
        title: "Address Lookup Ready",
        description: "You can now search and autocomplete addresses",
        variant: "default"
      });
    }
  }, [fallbackMode, isScriptLoaded, placesService, autocompleteService, toast]);

  const handleSearch = useCallback(async (input: string) => {
    if (!input || !autocompleteService || fallbackMode) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error(`Places API Error: ${status}`));
            }
          }
        );
      });

      setSuggestions(predictions);
      setOpen(true);
    } catch (error) {
      console.error("Address lookup failed:", error);
      setSuggestions([]);
    } finally {
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
      const place = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId,
            fields: ['address_components', 'formatted_address']
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Place details error: ${status}`));
            }
          }
        );
      });

      if (!place.address_components) {
        throw new Error('Invalid address components');
      }

      const address = {
        address: place.formatted_address || '',
        city: '',
        state: '',
        zipCode: ''
      };

      place.address_components.forEach(component => {
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
    } catch (error) {
      console.error("Error getting address details:", error);
      // Fallback to basic parsing
      handleAddressSelect(placeId, description);
    } finally {
      setIsLoading(false);
    }
  }, [fallbackMode, onAddressSelect, placesService]);

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (!fallbackMode) {
      handleSearch(newValue);
    }
  };

  return (
    <Popover open={open && !fallbackMode} onOpenChange={setOpen}>
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
            disabled={!isScriptLoaded && !fallbackMode}
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
          {!isScriptLoaded && !fallbackMode ? (
            <CommandEmpty>Loading address service...</CommandEmpty>
          ) : suggestions.length === 0 ? (
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