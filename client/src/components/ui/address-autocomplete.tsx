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

  useEffect(() => {
    // Check if the script is already loaded
    if (window.google?.maps?.places) {
      initializeServices();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setScriptLoaded(true);
      initializeServices();
    };

    script.onerror = () => {
      console.error("Failed to load Google Places script");
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeServices = () => {
    if (window.google?.maps?.places) {
      const autoService = new window.google.maps.places.AutocompleteService();
      const placeService = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      setAutocompleteService(autoService);
      setPlacesService(placeService);
    }
  };

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService) return;
    setIsLoading(true);

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
            setSuggestions([]);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (placeId: string, description: string) => {
    if (!placesService) return;

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
            const types = component.types;
            if (types.includes("locality")) {
              addressData.city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              addressData.state = component.short_name;
            } else if (types.includes("postal_code")) {
              addressData.zipCode = component.long_name;
            }
          });

          onAddressSelect(addressData);
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
          disabled={!scriptLoaded}
        >
          {value || "Enter address..."}
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
          <CommandEmpty>No address found.</CommandEmpty>
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