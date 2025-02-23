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
      toast({
        title: "Limited Functionality",
        description: "Address autocomplete is not available. Please enter addresses manually.",
        variant: "default"
      });
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
        const dummyElement = document.createElement('div');
        const placesServiceInstance = new window.google.maps.places.PlacesService(dummyElement);
        const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();

        setPlacesService(placesServiceInstance);
        setAutocompleteService(autocompleteServiceInstance);
        setIsScriptLoaded(true);
        setFallbackMode(false);

        toast({
          title: "Address Lookup Ready",
          description: "You can now search and autocomplete addresses",
          variant: "default"
        });
      } catch (error) {
        console.error("Failed to initialize Places services:", error);
        handlePlacesError();
      }
    }

    // Handle API loading errors
    function handlePlacesError() {
      setFallbackMode(true);
      toast({
        title: "Address Lookup Limited",
        description: "Using manual address input mode. You can still enter addresses manually.",
        variant: "default"
      });
    }

    // Load the Places API script
    try {
      window.initGooglePlaces = () => {
        initializePlacesServices();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
      script.async = true;
      script.defer = true;
      script.onerror = handlePlacesError;

      document.head.appendChild(script);

      return () => {
        // Cleanup
        if (window.initGooglePlaces) {
          delete window.initGooglePlaces;
        }
        document.head.removeChild(script);
      };
    } catch (error) {
      console.error("Error loading Places API:", error);
      handlePlacesError();
    }
  }, [toast]);

  // Handle address search
  const handleSearch = useCallback(async (input: string) => {
    if (!input || !autocompleteService || fallbackMode) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
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
              reject(new Error(`Places API Error: ${status}`));
            }
          }
        );
      });

      setSuggestions(response);
      setOpen(true);
    } catch (error) {
      console.error("Address lookup failed:", error);
      if (!fallbackMode) {
        setFallbackMode(true);
        toast({
          title: "Switching to Manual Input",
          description: "Address lookup is temporarily unavailable. Please enter the address manually.",
          variant: "default"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [autocompleteService, fallbackMode, toast]);

  // Handle address selection
  const handleAddressSelect = useCallback(async (placeId: string, description: string) => {
    if (fallbackMode || !placesService) {
      // Parse address manually
      const parts = description.split(',').map(part => part.trim());
      const address = parts[0] || '';
      const city = parts[1] || '';
      const stateZip = parts[2] ? parts[2].split(' ').filter(Boolean) : [];

      onAddressSelect({
        address,
        city,
        state: stateZip[0] || '',
        zipCode: stateZip[1] || ''
      });

      setOpen(false);
      setValue(description);
      return;
    }

    try {
      setIsLoading(true);
      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId,
            fields: ['address_components', 'formatted_address']
          },
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error(`Failed to get address details: ${status}`));
            }
          }
        );
      });

      if (!result.address_components) {
        throw new Error('Invalid address components received');
      }

      const addressData = {
        address: result.formatted_address || '',
        city: '',
        state: '',
        zipCode: ''
      };

      // Parse address components
      result.address_components.forEach((component) => {
        const type = component.types[0];
        switch (type) {
          case 'locality':
            addressData.city = component.long_name;
            break;
          case 'administrative_area_level_1':
            addressData.state = component.short_name;
            break;
          case 'postal_code':
            addressData.zipCode = component.long_name;
            break;
        }
      });

      onAddressSelect(addressData);
      setValue(result.formatted_address || description);
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