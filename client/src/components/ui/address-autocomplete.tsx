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

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("Google Places API key is missing");
      setError("API configuration error - VITE_GOOGLE_PLACES_API_KEY not found");
      return;
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      console.log("Google Maps script already loaded");
      initializeServices();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("Google Maps script loaded successfully");
      setScriptLoaded(true);
      initializeServices();
    };

    script.onerror = (e) => {
      console.error("Failed to load Google Places script:", e);
      setError("Failed to load address service");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeServices = () => {
    try {
      if (window.google?.maps?.places) {
        console.log("Initializing Google Places services");
        const autoService = new window.google.maps.places.AutocompleteService();
        const placeService = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );
        setAutocompleteService(autoService);
        setPlacesService(placeService);
        setError(null);
      } else {
        console.error("Google Maps places library not available");
        setError("Address service not available");
      }
    } catch (err) {
      console.error("Error initializing services:", err);
      setError("Failed to initialize address service");
    }
  };

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService) return;

    console.log("Fetching predictions for:", input);
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
          console.log("Predictions status:", status, "Count:", predictions?.length);
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

    console.log("Getting details for place:", placeId);
    setValue(description);
    setOpen(false);

    placesService.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address"],
      },
      (place: PlaceResult | null, status: string) => {
        console.log("Place details status:", status);
        if (status === "OK" && place?.address_components) {
          const addressData = {
            address: place.formatted_address || "",
            city: "",
            state: "",
            zipCode: "",
          };

          place.address_components.forEach((component: AddressComponent) => {
            const types = component.types;
            if (types.includes("locality")) {
              addressData.city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              addressData.state = component.short_name;
            } else if (types.includes("postal_code")) {
              addressData.zipCode = component.long_name;
            }
          });

          console.log("Parsed address data:", addressData);
          onAddressSelect(addressData);
        } else {
          console.error("Error getting place details:", status);
          setError("Failed to get address details");
        }
      }
    );
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
          {value || (error ? error : "Enter address...")}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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