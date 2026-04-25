import { Slot, Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { restoreAuthToken } from "../lib/api";

function RootContent() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
}
