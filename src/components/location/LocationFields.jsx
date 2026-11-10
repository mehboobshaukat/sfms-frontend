import React, { useEffect, useMemo, useState } from "react";
import { locationsApi } from "../../api/locations";
import { Input } from "../ui/Input";
import Select from "../ui/Select";

/**
 * Shared registration/profile location fields. All values are controlled by the parent.
 * Country is ISO alpha-2; state is the *name* (not subdivision code), matching
 * the backend's free-text state field. Supports regions not in the ISO picklist.
 */
export default function LocationFields({ country, state, city, postalCode, onChange, required = false, idPrefix = "location" }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [countriesError, setCountriesError] = useState("");
  const [statesError, setStatesError] = useState("");
  const [customState, setCustomState] = useState(false);

  useEffect(() => {
    let active = true;
    locationsApi.countries()
      .then((items) => { if (active) setCountries(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setCountriesError("Country list could not be loaded. Check backend connection."); })
      .finally(() => { if (active) setLoadingCountries(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!country) {
      setStates([]);
      setLoadingStates(false);
      setStatesError("");
      return;
    }
    let active = true;
    setStates([]); // Never show another country's provinces while loading.
    setLoadingStates(true);
    setStatesError("");
    locationsApi.states(country)
      .then((items) => { if (active) setStates(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setStatesError("Province list unavailable. Enter your state manually."); })
      .finally(() => { if (active) setLoadingStates(false); });
    return () => { active = false; };
  }, [country]);

  const selectedCountry = useMemo(() => countries.find((item) => item.code === country), [countries, country]);
  const stateIsListed = states.some((item) => item.name === state);
  const showCustomState = customState || (!!state && !stateIsListed) || (!loadingStates && states.length === 0) || !!statesError;

  const updateCountry = (nextCountry) => {
    setCustomState(false);
    onChange({ country: nextCountry, state: "" }); // Don't retain an invalid state.
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Select
            label="Country"
            id={`${idPrefix}-country`}
            name="country"
            autoComplete="country"
            required={required}
            disabled={loadingCountries || !!countriesError}
            value={country}
            onChange={(e) => updateCountry(e.target.value)}
          >
            <option value="">{loadingCountries ? "Loading countries..." : "Select country"}</option>
            {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </Select>
          {countriesError && <p className="text-xs text-danger mt-1" role="alert">{countriesError}</p>}
        </div>
        <div>
          {country && !showCustomState && (states.length > 0 || loadingStates) ? (
            <Select
              label="State / Province"
              id={`${idPrefix}-state`}
              name="state"
              autoComplete="address-level1"
              required={required}
              disabled={loadingStates}
              value={stateIsListed ? state : ""}
              onChange={(e) => {
                if (e.target.value === "__other__") {
                  setCustomState(true);
                  onChange({ state: "" });
                } else {
                  onChange({ state: e.target.value });
                }
              }}
            >
              <option value="">{loadingStates ? "Loading states..." : "Select state / province"}</option>
              {states.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
              <option value="__other__">Other / Not listed (enter manually)</option>
            </Select>
          ) : (
            <div>
              <Input
                label="State / Province"
                id={`${idPrefix}-state`}
                name="state"
                autoComplete="address-level1"
                required={required}
                maxLength={100}
                disabled={!country}
                placeholder={country ? "Enter your state or province" : "Select country first"}
                value={state}
                onChange={(e) => onChange({ state: e.target.value })}
              />
              {states.length > 0 && !statesError && (
                <button type="button" className="text-xs text-primary mt-1 hover:underline" onClick={() => { setCustomState(false); onChange({ state: "" }); }}>Choose from list</button>
              )}
            </div>
          )}
          {statesError && <p className="text-xs text-muted mt-1" role="status">{statesError}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="City" id={`${idPrefix}-city`} name="city" maxLength={100} autoComplete="address-level2" value={city} onChange={(e) => onChange({ city: e.target.value })} hint="Optional" />
        <Input label="Postal / ZIP code" id={`${idPrefix}-postal`} name="postal_code" maxLength={20} autoComplete="postal-code" value={postalCode} onChange={(e) => onChange({ postal_code: e.target.value })} hint="Optional" />
      </div>
      {selectedCountry && (
        <p className="text-xs text-muted" role="status">
          Currency for {selectedCountry.name}: <strong className="text-ink">{selectedCountry.currency_symbol} ({selectedCountry.currency_code})</strong>.
          Amounts are displayed in this currency; existing money is not converted.
        </p>
      )}
    </div>
  );
}
