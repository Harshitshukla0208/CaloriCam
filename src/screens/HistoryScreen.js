import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../config/firebase";
import {
  getFoodEntries,
  getWeeklyHistory,
  deleteFoodEntry,
  getDailyCalories,
} from "../services/database";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function HistoryScreen() {
  const [todayEntries, setTodayEntries] = useState([]);
  const [weeklyHistory, setWeeklyHistory] = useState({});
  const [dailyCalories, setDailyCalories] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("today"); // 'today' or 'weekly'
  const [lastRefresh, setLastRefresh] = useState(null);

  // Real-time data fetching when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchRealTimeData = async () => {
        try {
          // Show loading only if it's been more than 5 seconds since last refresh
          const shouldShowLoading =
            !lastRefresh || Date.now() - lastRefresh > 5000;

          if (shouldShowLoading) {
            setLoading(true);
          }

          const userId = auth.currentUser?.uid;
          if (!userId) {
            throw new Error("User not authenticated");
          }

          // Fetch fresh data every time screen is focused
          const [entries, calories, history] = await Promise.all([
            getFoodEntries(userId),
            getDailyCalories(userId),
            getWeeklyHistory(userId),
          ]);

          setTodayEntries(entries || []);
          setDailyCalories(calories || 0);
          setWeeklyHistory(history || {});
          setLastRefresh(Date.now());

          console.log("Real-time data refreshed:", {
            entriesCount: entries?.length || 0,
            calories: calories || 0,
            historyDays: Object.keys(history || {}).length,
          });
        } catch (error) {
          console.error("Error loading real-time data:", error);
          Alert.alert("Error", "Failed to load latest data. Please try again.");
        } finally {
          setLoading(false);
        }
      };

      fetchRealTimeData();

      // Optional: Set up a periodic refresh while the screen is focused
      const interval = setInterval(fetchRealTimeData, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(interval);
      };
    }, [lastRefresh])
  );

  const loadData = async (showLoadingIndicator = false) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Load today's entries and calories
      const [entries, calories, history] = await Promise.all([
        getFoodEntries(userId),
        getDailyCalories(userId),
        getWeeklyHistory(userId),
      ]);

      setTodayEntries(entries || []);
      setDailyCalories(calories || 0);
      setWeeklyHistory(history || {});
      setLastRefresh(Date.now());
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleDelete = (entryId, foodName) => {
    Alert.alert(
      "Delete Entry",
      `Are you sure you want to delete "${foodName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFoodEntry(entryId);
              // Immediately refresh data after deletion
              await loadData(false);
              Alert.alert("Success", "Entry deleted successfully");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete entry");
            }
          },
        },
      ]
    );
  };

  const renderTodayEntry = ({ item }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.foodName} numberOfLines={2}>
          {item.foodName}
        </Text>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.foodName)}
          style={styles.deleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.nutritionRow}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>{item.calories || 0} kcal</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>{item.protein || 0}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>{item.carbs || 0}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fat</Text>
          <Text style={styles.nutritionValue}>{item.fat || 0}g</Text>
        </View>
      </View>

      <View style={styles.entryFooter}>
        <Text style={styles.servingSize}>
          Serving: {item.servingSize || "Not specified"}
        </Text>
        <Text style={styles.timestamp}>
          {item.timestamp
            ? new Date(item.timestamp.toDate()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Unknown time"}
        </Text>
      </View>
    </View>
  );

  const renderWeeklyEntry = ({ item: date }) => {
    const entries = weeklyHistory[date] || [];
    const totalCalories = entries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    );

    return (
      <View style={styles.weeklyCard}>
        <View style={styles.weeklyHeader}>
          <Text style={styles.weeklyDate}>
            {new Date(date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <Text style={styles.weeklyCalories}>{totalCalories} kcal</Text>
        </View>

        <View style={styles.weeklyEntries}>
          {entries.map((entry, index) => (
            <Text key={index} style={styles.weeklyEntryText}>
              • {entry.foodName || "Unknown food"} ({entry.calories || 0} kcal)
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const getLastUpdateText = () => {
    if (!lastRefresh) return "";

    const now = Date.now();
    const diff = now - lastRefresh;

    if (diff < 60000) {
      // Less than 1 minute
      return "Just updated";
    } else if (diff < 300000) {
      // Less than 5 minutes
      return `Updated ${Math.floor(diff / 60000)}m ago`;
    } else {
      return `Updated ${new Date(lastRefresh).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  };

  if (loading && !todayEntries.length && !Object.keys(weeklyHistory).length) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading your food history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food History</Text>

        {lastRefresh && (
          <Text style={styles.lastUpdateText}>{getLastUpdateText()}</Text>
        )}

        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "today" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("today")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === "today" && styles.toggleButtonTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "weekly" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("weekly")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === "weekly" && styles.toggleButtonTextActive,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "today" && (
        <View style={styles.dailySummary}>
          <Text style={styles.dailyCaloriesLabel}>Today's Total</Text>
          <Text style={styles.dailyCaloriesValue}>{dailyCalories} kcal</Text>
          <Text style={styles.entriesCount}>
            {todayEntries.length}{" "}
            {todayEntries.length === 1 ? "entry" : "entries"}
          </Text>
        </View>
      )}

      {viewMode === "today" ? (
        <FlatList
          data={todayEntries}
          renderItem={renderTodayEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                No food entries for today
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Start by taking a photo of your meal
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={Object.keys(weeklyHistory).sort(
            (a, b) => new Date(b) - new Date(a)
          )}
          renderItem={renderWeeklyEntry}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                No weekly history available
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Your weekly data will appear here as you add entries
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: Math.min(16, screenWidth * 0.04),
    color: "#6B7280",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: Math.min(24, screenWidth * 0.06),
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 5,
  },
  lastUpdateText: {
    fontSize: Math.min(12, screenWidth * 0.03),
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 15,
  },
  toggleButtons: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "white",
  },
  toggleButtonText: {
    color: "white",
    fontSize: Math.min(14, screenWidth * 0.035),
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#4F46E5",
  },
  dailySummary: {
    backgroundColor: "white",
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dailyCaloriesLabel: {
    fontSize: Math.min(16, screenWidth * 0.04),
    color: "#6B7280",
    marginBottom: 5,
  },
  dailyCaloriesValue: {
    fontSize: Math.min(32, screenWidth * 0.08),
    fontWeight: "bold",
    color: "#4F46E5",
  },
  entriesCount: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#9CA3AF",
    marginTop: 5,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  entryCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  foodName: {
    fontSize: Math.min(18, screenWidth * 0.045),
    fontWeight: "bold",
    color: "#4F46E5",
    flex: 1,
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  nutritionLabel: {
    fontSize: Math.min(12, screenWidth * 0.03),
    color: "#6B7280",
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: Math.min(14, screenWidth * 0.035),
    fontWeight: "600",
    color: "#111827",
  },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  servingSize: {
    fontSize: Math.min(12, screenWidth * 0.03),
    color: "#6B7280",
    flex: 1,
  },
  timestamp: {
    fontSize: Math.min(12, screenWidth * 0.03),
    color: "#9CA3AF",
    fontWeight: "500",
  },
  weeklyCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  weeklyDate: {
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "bold",
    color: "#4F46E5",
  },
  weeklyCalories: {
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "600",
    color: "#111827",
  },
  weeklyEntries: {
    paddingLeft: 10,
  },
  weeklyEntryText: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#6B7280",
    marginBottom: 5,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: Math.min(18, screenWidth * 0.045),
    color: "#6B7280",
    marginTop: 15,
    marginBottom: 5,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});
