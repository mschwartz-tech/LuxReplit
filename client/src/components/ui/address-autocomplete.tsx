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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);

  const validateApiKey = async (apiKey: string) => {
    try {
      const testResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=test&key=${apiKey}`
      );
      const testData = await testResponse.json();
      setDebugInfo(prev => `${prev}\nAPI Key validation response: ${testData.status}`);

      if (testData.error_message) {
        return { isValid: false, error: testData.error_message };
      }
      if (testData.status === 'REQUEST_DENIED') {
        return { isValid: false, error: 'API key is invalid or Places API is not enabled' };
      }
      if (testData.status === 'ZERO_RESULTS') {
        // This is actually okay - it means the API is working but found no results
        return { isValid: true, error: null };
      }
      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate API key' };
    }
  };

  const initializePlacesAPI = async () => {
    try {
      setStatus('loading');
      setErrorMessage('');
      setDebugInfo(`Attempt ${retryCount + 1} of ${MAX_RETRIES}\nStarting Places API initialization...`);

      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        throw new Error('Google Places API key is missing');
      }
      setDebugInfo(prev => `${prev}\nAPI Key found`);

      // Validate API key
      const validation = await validateApiKey(apiKey);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid API key');
      }

      // Clean up existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
        setDebugInfo(prev => `${prev}\nRemoved existing Google Maps script`);
      }

      // Load Places API script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        const timeoutId = setTimeout(() => {
          reject(new Error('Script loading timed out'));
        }, 10000);

        script.onload = () => {
          clearTimeout(timeoutId);
          setDebugInfo(prev => `${prev}\nGoogle Maps script loaded successfully`);
          resolve();
        };

        script.onerror = (error) => {
          clearTimeout(timeoutId);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setDebugInfo(prev => `${prev}\nScript load error: ${errorMessage}`);
          reject(new Error(`Failed to load Google Places API: ${errorMessage}`));
        };

        document.head.appendChild(script);
      });

      // Initialize services
      if (!window.google?.maps?.places) {
        throw new Error('Google Places API not available after script load');
      }

      try {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        setDebugInfo(prev => `${prev}\nServices initialized successfully`);
        setStatus('ready');
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        throw new Error(`Failed to initialize services: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Places API initialization error:', errorMessage);
      setStatus('error');
      setErrorMessage(errorMessage);
      setDebugInfo(prev => `${prev}\nFinal error: ${errorMessage}`);

      // Retry logic
      if (retryCount < MAX_RETRIES - 1) {
        setRetryCount(prev => prev + 1);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Exponential backoff with max 8s
        retryTimeoutRef.current = setTimeout(() => {
          initializePlacesAPI();
        }, delay);
      }
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
            setDebugInfo(prev => `${prev}\nPredictions status: ${status}`);
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
      setDebugInfo(prev => `${prev}\nPrediction error: ${error.message}`);
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
      setDebugInfo(prev => `${prev}\nAddress details error: ${error.message}`);
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
            Initializing address service... (Attempt {retryCount + 1}/{MAX_RETRIES})
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
            <div className="text-xs mt-2 p-2 bg-muted rounded">
              <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setRetryCount(0);
                initializePlacesAPI();
              }}
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

// Add TypeScript support for the google global object
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService?: new () => any;
          PlacesService?: new (element: Element) => any;
        };
      };
    };
    initGoogleMaps?: () => void;
  }
}