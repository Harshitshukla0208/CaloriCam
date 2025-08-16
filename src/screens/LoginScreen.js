import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import { auth } from "../config/firebase";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      console.log("Anonymous sign in successful");
    } catch (error) {
      console.error("Anonymous sign in error:", error);
      Alert.alert("Error", "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setLoading(true);

      // Try anonymous sign-in first (simplest method)
      await signInAnonymously(auth);
      console.log("Anonymous sign in successful");
    } catch (error) {
      console.error("Authentication error:", error);

      if (error.code === "auth/operation-not-allowed") {
        Alert.alert(
          "Setup Required",
          'Please enable Anonymous authentication in Firebase Console:\n\n1. Go to Firebase Console\n2. Authentication → Sign-in method\n3. Enable "Anonymous" provider',
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/fast-food.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>CaloriCam</Text>
        <Text style={styles.subtitle}>
          Track your calories by simply taking photos of your food
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleDemoSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Image
                source={{
                  uri: "https://developers.google.com/identity/images/g-logo.png",
                }}
                style={styles.googleIcon}
              />
              <Text style={styles.buttonText}>Continue as Demo User</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.demoNote}>
          No registration required - Start tracking immediately!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4F46E5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    marginBottom: 50,
    opacity: 0.9,
  },
  button: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  buttonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "600",
  },
  demoNote: {
    color: "white",
    fontSize: 12,
    opacity: 0.7,
    marginTop: 15,
    textAlign: "center",
  },
});
