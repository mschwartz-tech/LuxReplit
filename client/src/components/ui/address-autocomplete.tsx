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
  const [initError, setInitError] = useState<string | null>(null);
  const [placesService, setPlacesService] = useState<any>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const initRetryCount = React.useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;
    console.log("Google Places API Key exists:", !!apiKey);

    if (!apiKey) {
      const error = "Google Places API key is missing. Please contact support.";
      console.error(error);
      setInitError(error);
      setFallbackMode(true);
      toast({
        title: "Configuration Error",
        description: "Address autocomplete is unavailable. Please enter address manually.",
        variant: "destructive",
      });
      return;
    }

    const initializePlacesServices = () => {
      try {
        console.log("Attempting to initialize Places services...");
        if (!window.google?.maps?.places) {
          throw new Error("Places API not loaded");
        }

        // Create a dummy map div for PlacesService (required by the API)
        const dummyElement = document.createElement('div');
        const placesServiceInstance = new window.google.maps.places.PlacesService(dummyElement);
        const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();

        console.log("Services created successfully");

        setPlacesService(placesServiceInstance);
        setAutocompleteService(autocompleteServiceInstance);
        setInitError(null);
        setFallbackMode(false);
        initRetryCount.current = 0;

        console.log("Places services initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Places services:", error);

        if (initRetryCount.current < maxRetries) {
          initRetryCount.current += 1;
          console.log(`Retrying initialization (attempt ${initRetryCount.current}/${maxRetries})`);
          setTimeout(initializePlacesServices, 1000 * initRetryCount.current);
        } else {
          const errorMessage = "Unable to initialize address lookup. Please enter address manually.";
          console.error(errorMessage);
          setInitError(errorMessage);
          setFallbackMode(true);
          toast({
            title: "Service Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    };

    // If Google Maps is already loaded, initialize services directly
    if (window.google?.maps?.places) {
      console.log("Google Maps already loaded, initializing services directly");
      initializePlacesServices();
      return;
    }

    // Otherwise, load the script
    console.log("Loading Google Maps script...");
    window.initGooglePlaces = initializePlacesServices;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      if (initRetryCount.current < maxRetries) {
        initRetryCount.current += 1;
        console.log(`Retrying script load (attempt ${initRetryCount.current}/${maxRetries})`);
        setTimeout(() => {
          document.head.appendChild(script);
        }, 1000 * initRetryCount.current);
      } else {
        const errorMessage = "Failed to load address lookup service. Please enter address manually.";
        console.error(errorMessage);
        setInitError(errorMessage);
        setFallbackMode(true);
        toast({
          title: "Service Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    document.head.appendChild(script);
    console.log("Google Maps script added to document");

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.initGooglePlaces) {
        delete window.initGooglePlaces;
      }
    };
  }, [toast]);

  const handleSearch = useCallback(async (input: string) => {
    if (!input || !autocompleteService || fallbackMode) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Searching for address:", input);

      const request = {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address']
      };

      autocompleteService.getPlacePredictions(
        request,
        (results: any, status: any) => {
          console.log("Places API response status:", status);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            console.log("Found suggestions:", results.length);
            setSuggestions(results);
            setOpen(true);
          } else {
            console.log("No suggestions found or error:", status);
            setSuggestions([]);
            if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              toast({
                title: "Search Error",
                description: "Unable to find address suggestions. Please try again.",
                variant: "destructive",
              });
            }
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Address lookup failed:", error);
      setSuggestions([]);
      setIsLoading(false);
      toast({
        title: "Search Error",
        description: "Failed to search for addresses. Please try again.",
        variant: "destructive",
      });
    }
  }, [autocompleteService, fallbackMode, toast]);

  const handleAddressSelect = useCallback(async (placeId: string, description: string) => {
    if (fallbackMode) {
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
      console.log("Getting details for place:", placeId);

      placesService.getDetails(
        {
          placeId,
          fields: ['address_components', 'formatted_address']
        },
        (place: any, status: any) => {
          console.log("Place details status:", status);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            console.log("Got place details:", place);
            const address = {
              address: '',
              city: '',
              state: '',
              zipCode: ''
            };

            let streetNumber = '';
            let streetName = '';

            place.address_components.forEach((component: any) => {
              const type = component.types[0];
              switch (type) {
                case 'street_number':
                  streetNumber = component.long_name;
                  break;
                case 'route':
                  streetName = component.long_name;
                  break;
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

            address.address = `${streetNumber} ${streetName}`.trim();
            console.log("Parsed address:", address);

            onAddressSelect(address);
            setValue(place.formatted_address || description);
            setOpen(false);
          } else {
            console.error("Failed to get place details:", status);
            toast({
              title: "Error",
              description: "Failed to get address details. Please try again.",
              variant: "destructive",
            });
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error getting address details:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to process address selection. Please try again.",
        variant: "destructive",
      });
    }
  }, [fallbackMode, onAddressSelect, placesService, toast]);

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
                if (!fallbackMode) {
                  handleSearch(newValue);
                }
              }}
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

      {initError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

AddressAutocomplete.displayName = "AddressAutocomplete";