import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { YL } from "../../constants/theme";

export default function AppLayout() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: YL.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={YL.yellow} />
      </View>
    );
  }

  if (!isLoggedIn) return <Redirect href="/(onboarding)/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
  );
}
