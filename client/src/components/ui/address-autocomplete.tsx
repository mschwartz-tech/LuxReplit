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

interface GoogleWindow extends Window {
  google: typeof google;
}

declare const window: GoogleWindow;

export function AddressAutocomplete({ onAddressSelect, className, ...props }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.error("Google Places API key is missing");
        return;
      }

      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsScriptLoaded(true);
        const dummyElement = document.createElement('div');
        setPlacesService(new google.maps.places.PlacesService(dummyElement));
      };

      script.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load Google Maps. Please try again later.",
          variant: "destructive"
        });
      };

      document.head.appendChild(script);

      return () => {
        script.remove();
      };
    };

    loadGoogleMapsScript();
  }, [toast]);

  const handleSearch = async (input: string) => {
    if (!input || !window.google?.maps?.places) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const autocompleteService = new google.maps.places.AutocompleteService();
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
        autocompleteService.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
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
      console.error("Error in handleSearch:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = async (placeId: string, description: string) => {
    if (!window.google?.maps || !placesService) {
      console.error("Google Maps API or Places service not available");
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
          (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
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

      result.address_components.forEach((component: google.maps.GeocoderAddressComponent) => {
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
      console.error("Error in handleAddressSelect:", error);
      toast({
        title: "Error",
        description: "Failed to get address details. Please try again.",
        variant: "destructive"
      });
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