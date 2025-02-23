import { logError, logInfo } from "./logger";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE_URL = "https://maps.googleapis.com/maps/api/place";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetails {
  address_components: AddressComponent[];
  formatted_address: string;
}

interface AddressSearchResult {
  description: string;
  place_id: string;
}

export async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  try {
    logInfo("Attempting address search", { query });

    const response = await fetch(
      `${PLACES_API_BASE_URL}/autocomplete/json?input=${encodeURIComponent(
        query
      )}&types=address&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      logError("Places API error response", { status: response.status, error: errorText });
      throw new Error(`Places API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    logInfo("Places API response", { status: data.status, predictions: data.predictions?.length });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      logError("Places API error status", { status: data.status, error: data.error_message });
      throw new Error(`Places API error: ${data.status}`);
    }

    const results = (data.predictions || []).map((prediction: any) => ({
      description: prediction.description,
      place_id: prediction.place_id
    }));

    logInfo("Address search completed", { query, resultCount: results.length });
    return results;
  } catch (error) {
    logError("Address search failed", { error: (error as Error).message });
    throw error;
  }
}

export async function getPlaceDetails(placeId: string): Promise<{
  address: string;
  city: string;
  state: string;
  zipCode: string;
}> {
  try {
    logInfo("Fetching place details", { placeId });

    const response = await fetch(
      `${PLACES_API_BASE_URL}/details/json?place_id=${placeId}&fields=address_component,formatted_address&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      logError("Place details API error response", { status: response.status, error: errorText });
      throw new Error(`Places API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    logInfo("Place details API response", { status: data.status });

    if (data.status !== "OK") {
      logError("Place details API error status", { status: data.status, error: data.error_message });
      throw new Error(`Places API error: ${data.status}`);
    }

    const result = data.result;
    const address = {
      address: '',
      city: '',
      state: '',
      zipCode: ''
    };

    let streetNumber = '';
    let streetName = '';

    result.address_components.forEach((component: AddressComponent) => {
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

    logInfo("Place details processed", { placeId, address });
    return address;
  } catch (error) {
    logError("Place details retrieval failed", { error: (error as Error).message, placeId });
    throw error;
  }
}