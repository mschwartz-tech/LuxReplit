/// <reference types="@types/google.maps" />
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
    initGoogleMaps?: () => void;
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
  const [fallbackMode, setFallbackMode] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;

    if (!apiKey) {
      console.warn("Google Places API key is missing, falling back to manual input");
      setFallbackMode(true);
      return;
    }

    // Prevent multiple script loads
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
        const dummyElement = document.createElement('div');
        setPlacesService(new window.google.maps.places.PlacesService(dummyElement));
      }
      return;
    }

    // Create initialization callback
    window.initGoogleMaps = () => {
      setIsScriptLoaded(true);
      const dummyElement = document.createElement('div');
      setPlacesService(new window.google.maps.places.PlacesService(dummyElement));
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.warn("Failed to load Google Maps script, falling back to manual input");
      setFallbackMode(true);
      toast({
        title: "Address Lookup Limited",
        description: "Using manual address input mode. You can still enter your address manually.",
        variant: "default"
      });
    };

    document.head.appendChild(script);

    return () => {
      if (window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
    };
  }, [toast]);

  const handleSearch = useCallback(async (input: string) => {
    if (!input || !window.google?.maps?.places || fallbackMode) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
        autocompleteService.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          }
        );
      });

      setSuggestions(response);
      setOpen(true);
    } catch (error) {
      console.warn("Address lookup failed:", error);
      setFallbackMode(true);
      toast({
        title: "Address Lookup Failed",
        description: "Please enter your address manually.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fallbackMode, toast]);

  const handleAddressSelect = useCallback(async (placeId: string, description: string) => {
    if (fallbackMode || !window.google?.maps || !placesService) {
      // Handle manual input
      const [street, city, stateZip] = description.split(',').map(s => s.trim());
      const [state, zipCode] = stateZip ? stateZip.split(' ').filter(Boolean) : ['', ''];

      onAddressSelect({
        address: street || description,
        city: city || '',
        state: state || '',
        zipCode: zipCode || ''
      });

      setOpen(false);
      return;
    }

    setValue(description);
    setOpen(false);

    try {
      setIsLoading(true);
      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId: placeId,
            fields: ['address_components', 'formatted_address']
          },
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error('Failed to get address details'));
            }
          }
        );
      });

      if (!result.address_components) {
        throw new Error('No address components found');
      }

      const addressData = {
        address: result.formatted_address || '',
        city: '',
        state: '',
        zipCode: ''
      };

      result.address_components.forEach((component) => {
        const type = component.types[0];
        if (type === 'locality') {
          addressData.city = component.long_name;
        } else if (type === 'administrative_area_level_1') {
          addressData.state = component.short_name;
        } else if (type === 'postal_code') {
          addressData.zipCode = component.long_name;
        }
      });

      onAddressSelect(addressData);
    } catch (error) {
      console.warn("Error getting address details:", error);
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
            onChange={handleManualInput}
            disabled={!isScriptLoaded && !fallbackMode}
            placeholder={fallbackMode ? "Enter full address..." : "Search address..."}
            {...props}
          />
          {isLoading ? (
            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          {!isScriptLoaded && !fallbackMode ? (
            <CommandEmpty>Loading address service...</CommandEmpty>
          ) : suggestions.length === 0 ? (
            <CommandEmpty>No address found.</CommandEmpty>
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