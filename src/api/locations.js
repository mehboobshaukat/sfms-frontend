import { apiClient, sharedGet } from "./client";

// These endpoints are public so the registration form can load them before login.
export const locationsApi = {
  countries: () => sharedGet("/locations/countries").then((r) => r.data),
  states: (countryCode) =>
    sharedGet(`/locations/countries/${encodeURIComponent(countryCode)}/states`).then((r) => r.data),
};
