import { useState, useEffect, forwardRef, useCallback } from "react";
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

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceResult {
  address_components?: AddressComponent[];
  formatted_address?: string;
}

interface ServiceStatus {
  scriptLoaded: boolean;
  servicesInitialized: boolean;
  error: string | null;
  apiKeyPresent: boolean;
  isInitializing: boolean;
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
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    scriptLoaded: false,
    servicesInitialized: false,
    error: null,
    apiKeyPresent: false,
    isInitializing: true
  });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const loadGoogleMapsScript = useCallback(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    console.log("AddressAutocomplete: Attempting to load Google Maps");

    setServiceStatus(prev => ({
      ...prev,
      isInitializing: true,
      apiKeyPresent: !!apiKey
    }));

    if (!apiKey) {
      const error = "Google Places API key is missing";
      console.error(error);
      setServiceStatus(prev => ({
        ...prev,
        error,
        isInitializing: false
      }));
      return;
    }

    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && existingScript.parentNode) {
      existingScript.parentNode.removeChild(existingScript);
    }

    // Define callback before creating script
    window.initGoogleMaps = () => {
      console.log("AddressAutocomplete: Google Maps callback initiated");
      setServiceStatus(prev => ({
        ...prev,
        scriptLoaded: true
      }));
      initializeServices();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    script.onerror = (error) => {
      console.error("AddressAutocomplete: Failed to load Google Places script", error);
      const errorMessage = "Failed to load address service";
      setServiceStatus(prev => ({
        ...prev,
        error: errorMessage,
        scriptLoaded: false,
        isInitializing: false
      }));

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadGoogleMapsScript();
        }, 2000 * Math.pow(2, retryCount));
      }
    };

    document.body.appendChild(script);
    console.log("AddressAutocomplete: Google Maps script appended to document");
  }, [retryCount]);

  const initializeServices = useCallback(() => {
    try {
      console.log("AddressAutocomplete: Initializing services");

      if (!window.google?.maps?.places) {
        throw new Error("Google Maps places library not available");
      }

      const autoService = new window.google.maps.places.AutocompleteService();
      const placeService = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      setAutocompleteService(autoService);
      setPlacesService(placeService);
      setServiceStatus(prev => ({
        ...prev,
        error: null,
        servicesInitialized: true,
        isInitializing: false
      }));

      console.log("AddressAutocomplete: Services initialized successfully");
    } catch (err) {
      console.error("AddressAutocomplete: Error initializing services:", err);
      setServiceStatus(prev => ({
        ...prev,
        error: "Failed to initialize address service",
        servicesInitialized: false,
        isInitializing: false
      }));
    }
  }, []);

  useEffect(() => {
    console.log("AddressAutocomplete: Component mounted");

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      console.log("AddressAutocomplete: Google Maps already loaded");
      setServiceStatus(prev => ({
        ...prev,
        scriptLoaded: true,
        isInitializing: true
      }));
      initializeServices();
      return;
    }

    loadGoogleMapsScript();

    return () => {
      console.log("AddressAutocomplete: Component cleanup");
      delete window.initGoogleMaps;
      const script = document.querySelector('script[src*="maps.googleapis.com"]');
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [loadGoogleMapsScript, initializeServices]);

  const getPlacePredictions = async (input: string) => {
    if (!input || !autocompleteService) return;

    setIsLoading(true);
    console.log("AddressAutocomplete: Fetching predictions for:", input);

    try {
      autocompleteService.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "us" },
          types: ["address"],
        },
        (predictions: Array<{ description: string; place_id: string }> | null, status: string) => {
          if (status === "OK" && predictions) {
            console.log("AddressAutocomplete: Predictions received:", predictions.length);
            setSuggestions(predictions);
          } else {
            console.error("AddressAutocomplete: Prediction error:", status);
            setSuggestions([]);
            if (status !== "ZERO_RESULTS") {
              setServiceStatus(prev => ({
                ...prev,
                error: "Failed to get address suggestions"
              }));
            }
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("AddressAutocomplete: Error fetching suggestions:", error);
      setServiceStatus(prev => ({
        ...prev,
        error: "Failed to get address suggestions"
      }));
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (placeId: string, description: string) => {
    if (!placesService) {
      console.error("AddressAutocomplete: Places service not initialized");
      return;
    }

    console.log("AddressAutocomplete: Fetching details for place:", placeId);
    setValue(description);
    setOpen(false);

    placesService.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address"],
      },
      (place: PlaceResult | null, status: string) => {
        if (status === "OK" && place?.address_components) {
          console.log("AddressAutocomplete: Place details received");
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
          console.error("AddressAutocomplete: Error getting place details:", status);
          setServiceStatus(prev => ({
            ...prev,
            error: "Failed to get address details"
          }));
        }
      }
    );
  };

  const handleRetry = () => {
    console.log("AddressAutocomplete: Retrying service initialization");
    setRetryCount(0);
    setServiceStatus({
      scriptLoaded: false,
      servicesInitialized: false,
      error: null,
      apiKeyPresent: false,
      isInitializing: true
    });
    loadGoogleMapsScript();
  };

  if (serviceStatus.isInitializing) {
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

  if (serviceStatus.error) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Address Service Error</AlertTitle>
          <AlertDescription className="flex flex-col space-y-2">
            <span>
              {serviceStatus.error}
              {!serviceStatus.apiKeyPresent && " (API Key missing)"}
            </span>
            <Button
              variant="outline"
              onClick={handleRetry}
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
            !value && "text-muted-foreground"
          )}
          disabled={!serviceStatus.servicesInitialized}
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
            {serviceStatus.error ? serviceStatus.error : "No address found."}
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