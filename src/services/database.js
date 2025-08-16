import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

export const saveFoodEntry = async (userId, foodData) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const docRef = await addDoc(collection(db, "foodEntries"), {
      userId,
      date: today,
      timestamp: Timestamp.now(), // Use Firestore Timestamp
      ...foodData,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving food entry:", error);
    throw error;
  }
};

export const getFoodEntries = async (userId, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Simplified query - will work with single field indexes until composite indexes are ready
    const q = query(
      collection(db, "foodEntries"),
      where("userId", "==", userId),
      where("date", "==", targetDate)
      // Temporarily remove orderBy until composite index is created
      // orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort in JavaScript as a temporary workaround
    return entries.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return timestampB - timestampA;
    });
  } catch (error) {
    console.error("Error getting food entries:", error);
    throw error;
  }
};

export const updateFoodEntry = async (entryId, updates) => {
  try {
    const docRef = doc(db, "foodEntries", entryId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating food entry:", error);
    throw error;
  }
};

export const deleteFoodEntry = async (entryId) => {
  try {
    await deleteDoc(doc(db, "foodEntries", entryId));
  } catch (error) {
    console.error("Error deleting food entry:", error);
    throw error;
  }
};

export const getDailyCalories = async (userId) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const entries = await getFoodEntries(userId, today);
    return entries.reduce((total, entry) => total + (entry.calories || 0), 0);
  } catch (error) {
    console.error("Error getting daily calories:", error);
    return 0;
  }
};

export const getWeeklyHistory = async (userId) => {
  try {
    // Use a simpler query with only userId filter
    const q = query(
      collection(db, "foodEntries"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const allEntries = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter for last 7 days in JavaScript
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const weeklyEntries = allEntries.filter(
      (entry) => entry.date >= startDateStr && entry.date <= endDateStr
    );

    // Group by date and sort in JavaScript
    const groupedByDate = weeklyEntries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {});

    // Sort entries within each date
    Object.keys(groupedByDate).forEach((date) => {
      groupedByDate[date].sort((a, b) => {
        const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return timestampB - timestampA;
      });
    });

    return groupedByDate;
  } catch (error) {
    console.error("Error getting weekly history:", error);
    return {};
  }
};

// Enhanced version to use once indexes are created
export const getFoodEntriesWithIndex = async (userId, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "foodEntries"),
      where("userId", "==", userId),
      where("date", "==", targetDate),
      orderBy("timestamp", "desc") // This will work once composite index is created
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting food entries with index:", error);
    throw error;
  }
};

export const getWeeklyHistoryWithIndex = async (userId) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const q = query(
      collection(db, "foodEntries"),
      where("userId", "==", userId),
      where("date", ">=", startDate.toISOString().split("T")[0]),
      where("date", "<=", endDate.toISOString().split("T")[0]),
      orderBy("date", "desc") // This will work once composite index is created
    );

    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group by date
    const groupedByDate = entries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {});

    return groupedByDate;
  } catch (error) {
    console.error("Error getting weekly history with index:", error);
    return {};
  }
};
