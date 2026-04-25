import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { YL } from "../constants/theme";

export default function Root() {
  const { isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: YL.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={YL.yellow} />
      </View>
    );
  }

  return <Redirect href={isLoggedIn ? "/(app)/home" : "/(onboarding)/welcome"} />;
}
