import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

// 1. Types for Google Maps
declare global {
  interface Window {
    google: any;
    __googleMapsLoading?: Promise<any>;
  }
}

export interface LocationData {
  description: string;
  placeId: string;
  placeName?: string;
  lat?: number;
  lng?: number;
}

// 2. Bounds for Bengaluru
const BLR_BOUNDS = {
  north: 13.45, south: 12.50, east: 78.10, west: 77.10,
};

// 3. Lazy-load Google Maps script on first use (not in HTML head)
const loadGoogleMaps = (): Promise<any> => {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Deduplicate: only one script load at a time
  if (window.__googleMapsLoading) return window.__googleMapsLoading;

  window.__googleMapsLoading = new Promise((resolve, reject) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=beta&loading=async`;
    script.async = true;
    script.onload = () => {
      // Wait for google.maps to be available
      const check = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(check);
          resolve(window.google.maps);
        }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error("Google Maps timeout")); }, 10000);
    };
    script.onerror = () => {
      window.__googleMapsLoading = undefined;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return window.__googleMapsLoading;
};

interface Props {
  placeholder?: string;
  value?: string;
  onLocationSelect: (location: LocationData) => void;
}

export function LocationAutocomplete({ placeholder, value, onLocationSelect }: Props) {
  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Handle Input Change using the new 2025 API
  const handleInputChange = async (text: string) => {
    setInputValue(text);

    // Only notify parent when input is fully cleared (resets pricing / enables guard).
    // Avoid calling onLocationSelect on every keystroke – that would trigger a
    // parent re-render ➜ unmount this component ➜ keyboard closes & predictions lost.
    if (!text) {
      onLocationSelect({ description: "", placeId: "" });
    }

    if (!text || text.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    try {
      // Lazy-load Google Maps if not yet available
      await loadGoogleMaps();

      // 🚀 FIXED: Swapped 'componentRestrictions' for 'includedRegionCodes'
      const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
        locationRestriction: BLR_BOUNDS,
        includedRegionCodes: ["in"], // 👈 THIS IS THE FIX (must be an array)
      });

      if (suggestions && suggestions.length > 0) {
        setPredictions(suggestions);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.warn("Places API Error:", error);
      setPredictions([]);
      setShowDropdown(false);
      // Could add user-facing error state here if needed
    }
  };

  // Handle Selection
  const handleSelect = async (description: string, placeId: string) => {
    setInputValue(description);
    setShowDropdown(false);

    // Fetch Place Details to get displayName (place name)
    try {
      if (placeId && window.google?.maps?.places?.Place) {
        const place = new window.google.maps.places.Place({ id: placeId });
        await place.fetchFields({ fields: ["displayName", "location"] });
        const placeName = place.displayName || "";
        const lat = place.location?.lat();
        const lng = place.location?.lng();
        onLocationSelect({ description, placeId, placeName: placeName || undefined, lat, lng });
        return;
      }
    } catch (err) {
      console.warn("Place details fetch failed:", err);
    }

    onLocationSelect({ description, placeId });
  };

  return (
    <View style={styles.container}>
      {/* Custom HTML Input */}
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder || "Search location"}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => inputValue && predictions.length > 0 && setShowDropdown(true)}
        style={{
          width: "100%",
          height: "44px",
          padding: "0 12px",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          fontSize: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: "500",
          outline: "none",
          backgroundColor: "#F9FAFB",
          boxSizing: "border-box",
          color: "#111827"
        }}
      />

      {/* Custom Dropdown List */}
      {showDropdown && predictions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "48px",
          left: 0,
          right: 0,
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0px 6px 20px rgba(0,0,0,0.10)",
          zIndex: 9999,
          maxHeight: "240px",
          overflowY: "auto",
          border: "1px solid #F3F4F6",
          padding: "6px 0"
        }}>
          {predictions.map((item, index) => {
            const description = item.placePrediction.text.text;
            const placeId = item.placePrediction.placeId || "";
            
            return (
              <div
                key={placeId || index}
                onClick={() => handleSelect(description, placeId)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  transition: "background-color 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#FFF9DB"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              >
                {description}
              </div>
            );
          })}
        </div>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    zIndex: 100,
    marginTop: 6,
    overflow: "visible" as const,
  },
});