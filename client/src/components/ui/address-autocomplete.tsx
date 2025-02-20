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
import { Check, ChevronsUpDown } from "lucide-react";
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

// Define types for Google Maps API
declare global {
  interface Window {
    google: typeof google;
    initAutoComplete: () => void;
  }
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
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // Initialize Google Places services
    if (window.google && !autocompleteService) {
      const autoService = new window.google.maps.places.AutocompleteService();
      const placeService = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      setAutocompleteService(autoService);
      setPlacesService(placeService);
    }
  }, []);

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService) return;

    try {
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: "us" },
            types: ["address"],
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              reject(status);
            }
          }
        );
      });
      setSuggestions(response);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleAddressSelect = (placeId: string) => {
    if (!placesService) return;

    placesService.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address"],
      },
      (place: PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const addressComponents = place.address_components || [];
          const addressData = {
            address: place.formatted_address || "",
            city: "",
            state: "",
            zipCode: "",
          };

          addressComponents.forEach((component: AddressComponent) => {
            const types = component.types;
            if (types.includes("locality")) {
              addressData.city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              addressData.state = component.short_name;
            } else if (types.includes("postal_code")) {
              addressData.zipCode = component.long_name;
            }
          });

          setValue(addressData.address);
          setOpen(false);
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
        >
          {value || "Enter address..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                onSelect={() => handleAddressSelect(suggestion.place_id)}
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