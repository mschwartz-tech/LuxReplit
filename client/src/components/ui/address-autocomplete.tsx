import { useState, useEffect } from "react";
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
import { Check, Loader2 } from "lucide-react";

interface AddressAutocompleteProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
}

export function AddressAutocomplete({ onAddressSelect, className, ...props }: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      console.log("Starting to load Google Maps script");
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      console.log("API Key available:", !!apiKey);

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log("Google Maps script loaded successfully");
        setIsScriptLoaded(true);
      };

      script.onerror = (error) => {
        console.error("Error loading Google Maps script:", error);
      };

      // Remove any existing scripts
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log("Removing existing Google Maps script");
        existingScript.remove();
      }

      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  const handleSearch = async (input: string) => {
    if (!input) {
      console.log("No input provided for search");
      setSuggestions([]);
      return;
    }

    if (!window.google?.maps?.places) {
      console.error("Google Places API not available");
      return;
    }

    try {
      console.log("Starting address search for:", input);
      setIsLoading(true);

      const autocompleteService = new google.maps.places.AutocompleteService();
      const results = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (predictions, status) => {
            console.log("Autocomplete service response status:", status);
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              console.log("Received predictions:", predictions.length);
              resolve(predictions);
            } else {
              console.log("No predictions found or error:", status);
              resolve([]);
            }
          }
        );
      });

      setSuggestions(results);
      setOpen(true);
    } catch (error) {
      console.error("Error in handleSearch:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = async (placeId: string, description: string) => {
    if (!window.google?.maps) {
      console.error("Google Maps API not available for geocoding");
      return;
    }

    console.log("Selected place ID:", placeId);
    setValue(description);
    setOpen(false);

    try {
      setIsLoading(true);
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ placeId }, (results, status) => {
          console.log("Geocoder response status:", status);
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Failed to get address details'));
          }
        });
      });

      console.log("Geocoder result:", result);
      const addressComponents = result.address_components;
      const addressData = {
        address: result.formatted_address || '',
        city: '',
        state: '',
        zipCode: ''
      };

      for (const component of addressComponents) {
        const type = component.types[0];
        if (type === 'locality') {
          addressData.city = component.long_name;
        } else if (type === 'administrative_area_level_1') {
          addressData.state = component.short_name;
        } else if (type === 'postal_code') {
          addressData.zipCode = component.long_name;
        }
      }

      console.log("Parsed address data:", addressData);
      onAddressSelect(addressData);
    } catch (error) {
      console.error("Error in handleAddressSelect:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
              handleSearch(newValue);
            }}
            disabled={!isScriptLoaded}
            placeholder="Enter address..."
            {...props}
          />
          {isLoading && (
            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          {!isScriptLoaded ? (
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

declare global {
  interface Window {
    google: typeof google;
  }
}