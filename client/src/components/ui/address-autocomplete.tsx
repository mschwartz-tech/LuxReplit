import { useState, useRef, useEffect } from "react";
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
import { Check, ChevronsUpDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Skeleton } from "./skeleton";

interface AddressAutocompleteProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
}

export const AddressAutocomplete = ({ onAddressSelect, className, ...props }: AddressAutocompleteProps) => {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);

  const initializePlacesAPI = async () => {
    try {
      setStatus('loading');
      setErrorMessage('');

      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        throw new Error('Google Places API key is missing');
      }

      // Clean up any existing scripts
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Load the Places API script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Places API'));
        document.head.appendChild(script);
      });

      // Initialize services
      if (!window.google?.maps?.places) {
        throw new Error('Google Places API not available');
      }

      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      setStatus('ready');
    } catch (error) {
      console.error('Places API initialization error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to initialize address service');

      // Retry after 3 seconds
      retryTimeoutRef.current = setTimeout(() => {
        initializePlacesAPI();
      }, 3000);
    }
  };

  useEffect(() => {
    initializePlacesAPI();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService.current) return;

    setIsLoading(true);
    try {
      const predictions = await new Promise<any[]>((resolve, reject) => {
        autocompleteService.current.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (results: any[] | null, status: string) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else if (status === 'ZERO_RESULTS') {
              resolve([]);
            } else {
              reject(new Error(`Failed to get predictions: ${status}`));
            }
          }
        );
      });

      setSuggestions(predictions);
    } catch (error) {
      console.error('Error getting predictions:', error);
      setErrorMessage('Failed to get address suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = async (placeId: string, description: string) => {
    if (!placesService.current) return;

    setValue(description);
    setOpen(false);
    setIsLoading(true);

    try {
      const place = await new Promise<any>((resolve, reject) => {
        placesService.current.getDetails(
          {
            placeId,
            fields: ['address_components', 'formatted_address']
          },
          (result: any, status: string) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`Failed to get place details: ${status}`));
            }
          }
        );
      });

      const addressData = {
        address: place.formatted_address || '',
        city: '',
        state: '',
        zipCode: ''
      };

      place.address_components.forEach((component: any) => {
        if (component.types.includes('locality')) {
          addressData.city = component.long_name;
        } else if (component.types.includes('administrative_area_level_1')) {
          addressData.state = component.short_name;
        } else if (component.types.includes('postal_code')) {
          addressData.zipCode = component.long_name;
        }
      });

      onAddressSelect(addressData);
    } catch (error) {
      console.error('Error getting place details:', error);
      setErrorMessage('Failed to get address details');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">
            Initializing address service...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Address Service Error</AlertTitle>
          <AlertDescription className="flex flex-col space-y-2">
            <span>{errorMessage}</span>
            <Button
              variant="outline"
              onClick={() => initializePlacesAPI()}
              className="w-full mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading Address Service
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 font-normal",
            !value && "text-muted-foreground",
            className
          )}
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
          <CommandEmpty>
            {errorMessage || "No address found."}
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
};

AddressAutocomplete.displayName = "AddressAutocomplete";