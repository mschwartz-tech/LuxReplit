import { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "./button";

interface AddressAutocompleteProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceResult {
  address_components?: AddressComponent[];
  formatted_address?: string;
}

export const AddressAutocomplete = forwardRef<
  HTMLInputElement,
  AddressAutocompleteProps
>(({ className, onAddressSelect, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    description: string;
    place_id: string;
  }>>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [placesService, setPlacesService] = useState<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const removeExistingScript = () => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && existingScript.parentNode) {
      try {
        existingScript.parentNode.removeChild(existingScript);
      } catch (err) {
        console.error("Error removing existing script:", err);
      }
    }
  };

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      console.log("Attempting to load Google Maps with key available:", !!apiKey);

      if (!apiKey) {
        console.error("Google Places API key is missing");
        setError("API configuration error");
        return;
      }

      // Check if script is already loaded
      if (typeof window.google !== 'undefined' && window.google?.maps?.places) {
        console.log("Google Maps script already loaded");
        initializeServices();
        return;
      }

      // Remove any existing script first
      removeExistingScript();

      try {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;

        // Define the callback
        window.initGoogleMaps = () => {
          console.log("Google Maps callback initiated");
          setScriptLoaded(true);
          setError(null);
          initializeServices();
        };

        script.onerror = () => {
          console.error("Failed to load Google Places script");
          setError("Failed to load address service");

          // Retry logic
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              removeExistingScript();
              loadGoogleMapsScript();
            }, 2000 * Math.pow(2, retryCount)); // Exponential backoff
          }
        };

        document.body.appendChild(script);
        console.log("Google Maps script appended to document");
      } catch (err) {
        console.error("Error loading script:", err);
        setError("Failed to initialize address service");
      }
    };

    loadGoogleMapsScript();

    // Cleanup
    return () => {
      removeExistingScript();
      // @ts-ignore - Clean up the global callback
      delete window.initGoogleMaps;
    };
  }, [retryCount]);

  const initializeServices = () => {
    try {
      if (window.google?.maps?.places) {
        const autoService = new window.google.maps.places.AutocompleteService();
        const placeService = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );
        setAutocompleteService(autoService);
        setPlacesService(placeService);
        setError(null);
        setScriptLoaded(true);
      } else {
        throw new Error("Google Maps places library not available");
      }
    } catch (err) {
      console.error("Error initializing services:", err);
      setError("Failed to initialize address service");
      setScriptLoaded(false);
    }
  };

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService) return;

    setIsLoading(true);
    setError(null);

    try {
      autocompleteService.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "us" },
          types: ["address"],
        },
        (predictions: Array<{ description: string; place_id: string }> | null, status: string) => {
          if (status === "OK" && predictions) {
            setSuggestions(predictions);
          } else {
            console.error("Prediction error:", status);
            setSuggestions([]);
            if (status !== "ZERO_RESULTS") {
              setError("Failed to get address suggestions");
            }
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setError("Failed to get address suggestions");
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (placeId: string, description: string) => {
    if (!placesService) {
      console.error("Places service not initialized");
      return;
    }

    setValue(description);
    setOpen(false);

    placesService.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address"],
      },
      (place: PlaceResult | null, status: string) => {
        if (status === "OK" && place?.address_components) {
          const addressData = {
            address: place.formatted_address || "",
            city: "",
            state: "",
            zipCode: "",
          };

          place.address_components.forEach((component: AddressComponent) => {
            if (component.types.includes("locality")) {
              addressData.city = component.long_name;
            } else if (component.types.includes("administrative_area_level_1")) {
              addressData.state = component.short_name;
            } else if (component.types.includes("postal_code")) {
              addressData.zipCode = component.long_name;
            }
          });

          onAddressSelect(addressData);
        } else {
          console.error("Error getting place details:", status);
          setError("Failed to get address details");
        }
      }
    );
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    setScriptLoaded(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={!scriptLoaded || !!error}
        >
          {error ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-destructive">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              {value || "Enter address..."}
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search address..."
            value={value}
            onValueChange={(value) => {
              setValue(value);
              getPlacePredictions(value);
            }}
          />
          <CommandEmpty>
            {error ? error : "No address found."}
          </CommandEmpty>
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
        </Command>
      </PopoverContent>
    </Popover>
  );
});

AddressAutocomplete.displayName = "AddressAutocomplete";

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}