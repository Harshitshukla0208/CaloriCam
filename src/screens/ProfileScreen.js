import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { getDailyCalories, getWeeklyHistory } from "../services/database";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    setUser(auth.currentUser);
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const userId = auth.currentUser.uid;
      const [calories, history] = await Promise.all([
        getDailyCalories(userId),
        getWeeklyHistory(userId),
      ]);

      setDailyCalories(calories);

      // Calculate weekly average and total entries
      const dates = Object.keys(history);
      let totalCalories = 0;
      let totalEntriesCount = 0;

      dates.forEach((date) => {
        const dayEntries = history[date];
        totalEntriesCount += dayEntries.length;
        totalCalories += dayEntries.reduce(
          (sum, entry) => sum + entry.calories,
          0
        );
      });

      setTotalEntries(totalEntriesCount);
      setWeeklyAverage(
        dates.length > 0 ? Math.round(totalCalories / dates.length) : 0
      );
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <Image
            source={{
              uri: user?.photoURL || "https://via.placeholder.com/100",
            }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.displayName || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={30} color="#4F46E5" />
              <Text style={styles.statValue}>{dailyCalories}</Text>
              <Text style={styles.statLabel}>Today's Calories</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={30} color="#4F46E5" />
              <Text style={styles.statValue}>{weeklyAverage}</Text>
              <Text style={styles.statLabel}>Daily Average</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="restaurant" size={30} color="#4F46E5" />
              <Text style={styles.statValue}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About CaloriCam</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              CaloriCam uses advanced AI to analyze your food photos and provide
              accurate calorie estimates. Simply take a photo of your meal and
              get instant nutrition information.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="camera" size={20} color="#4F46E5" />
                <Text style={styles.featureText}>
                  Photo-based calorie tracking
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="location" size={20} color="#4F46E5" />
                <Text style={styles.featureText}>
                  Location-aware food recognition
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="analytics" size={20} color="#4F46E5" />
                <Text style={styles.featureText}>
                  Detailed nutrition breakdown
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="cloud" size={20} color="#4F46E5" />
                <Text style={styles.featureText}>
                  Cloud sync across devices
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#4F46E5",
    padding: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#6B7280",
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4F46E5",
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
    marginBottom: 20,
  },
  featureList: {
    gap: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 15,
  },
  footer: {
    padding: 20,
  },
  signOutButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 15,
    gap: 10,
  },
  signOutText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
