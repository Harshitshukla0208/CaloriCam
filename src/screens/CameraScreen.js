import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { analyzeFood } from "../config/gemini";
import { saveFoodEntry } from "../services/database";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef();

  // Handle screen focus to reinitialize camera
  useFocusEffect(
    React.useCallback(() => {
      setIsFocused(true);
      setCameraReady(false);

      // Small delay to ensure proper initialization
      const timer = setTimeout(() => {
        setCameraReady(true);
      }, 100);

      return () => {
        setIsFocused(false);
        setCameraReady(false);
        clearTimeout(timer);
      };
    }, [])
  );

  useEffect(() => {
    (async () => {
      // Get location permission
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      if (locationStatus.status === "granted") {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });

          if (geocode[0]) {
            setLocation({
              city: geocode[0].city,
              country: geocode[0].country,
            });
          }
        } catch (error) {
          console.log("Location error:", error);
        }
      }
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.8,
        });

        await analyzeImage(photo.base64);
      } catch (error) {
        console.error("Camera error:", error);
        Alert.alert("Error", "Failed to take picture");
        setLoading(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        // Add cropping options
        cropperActiveWidgetColor: "#4F46E5",
        cropperStatusBarColor: "#4F46E5",
        cropperToolbarColor: "#4F46E5",
        cropperToolbarWidgetColor: "#FFFFFF",
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        await analyzeImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const analyzeImage = async (base64Image) => {
    try {
      const result = await analyzeFood(base64Image, location);
      setAnalysisResult(result);
      setShowResult(true);
    } catch (error) {
      Alert.alert("Analysis Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    try {
      setLoading(true);
      await saveFoodEntry(auth.currentUser.uid, analysisResult);
      Alert.alert("Success", "Food entry saved successfully!");
      setShowResult(false);
      setAnalysisResult(null);
    } catch (error) {
      Alert.alert("Error", "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const editAndSave = async (editedData) => {
    try {
      setLoading(true);
      await saveFoodEntry(auth.currentUser.uid, editedData);
      Alert.alert("Success", "Food entry saved successfully!");
      setShowResult(false);
      setAnalysisResult(null);
    } catch (error) {
      Alert.alert("Error", "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#4F46E5" />
          <Text style={styles.noPermissionText}>
            We need your permission to show the camera
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>CaloriCam</Text>
        {location && (
          <Text style={styles.locationText}>
            📍 {location.city}, {location.country}
          </Text>
        )}
      </View>

      <View style={styles.cameraContainer}>
        {isFocused ? (
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
            onCameraReady={handleCameraReady}
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={30} color="white" />
              </TouchableOpacity>
            </View>

            {/* Camera viewfinder guide */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.viewfinder} />
            </View>
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.cameraPlaceholderText}>
              Initializing Camera...
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <Ionicons name="images" size={24} color="#4F46E5" />
          <Text style={styles.buttonLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureButton,
            (loading || !cameraReady) && styles.captureButtonDisabled,
          ]}
          onPress={takePicture}
          disabled={loading || !cameraReady}
        >
          {loading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        <View style={styles.placeholder}>
          <Text style={styles.instructionText}>Tap to{"\n"}capture</Text>
        </View>
      </View>

      <ResultModal
        visible={showResult}
        result={analysisResult}
        onSave={saveEntry}
        onEdit={editAndSave}
        onClose={() => setShowResult(false)}
        loading={loading}
      />
    </SafeAreaView>
  );
}

function ResultModal({ visible, result, onSave, onEdit, onClose, loading }) {
  const [editing, setEditing] = useState(false);
  const [editedResult, setEditedResult] = useState(null);

  useEffect(() => {
    if (result) {
      setEditedResult({ ...result });
    }
  }, [result]);

  const handleEdit = () => {
    onEdit(editedResult);
  };

  const resetEditing = () => {
    setEditing(false);
    if (result) {
      setEditedResult({ ...result });
    }
  };

  if (!result) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Food Analysis Result</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultCard}>
            <Text style={styles.foodName}>
              {editing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedResult.foodName}
                  onChangeText={(text) =>
                    setEditedResult({ ...editedResult, foodName: text })
                  }
                  placeholder="Food name"
                />
              ) : (
                result.foodName
              )}
            </Text>

            <View style={styles.nutritionGrid}>
              <NutritionItem
                label="Calories"
                value={editing ? editedResult.calories : result.calories}
                unit="kcal"
                editing={editing}
                onEdit={(value) =>
                  setEditedResult({
                    ...editedResult,
                    calories: parseInt(value) || 0,
                  })
                }
              />
              <NutritionItem
                label="Protein"
                value={editing ? editedResult.protein : result.protein}
                unit="g"
                editing={editing}
                onEdit={(value) =>
                  setEditedResult({
                    ...editedResult,
                    protein: parseFloat(value) || 0,
                  })
                }
              />
              <NutritionItem
                label="Carbs"
                value={editing ? editedResult.carbs : result.carbs}
                unit="g"
                editing={editing}
                onEdit={(value) =>
                  setEditedResult({
                    ...editedResult,
                    carbs: parseFloat(value) || 0,
                  })
                }
              />
              <NutritionItem
                label="Fat"
                value={editing ? editedResult.fat : result.fat}
                unit="g"
                editing={editing}
                onEdit={(value) =>
                  setEditedResult({
                    ...editedResult,
                    fat: parseFloat(value) || 0,
                  })
                }
              />
            </View>

            <Text style={styles.servingSize}>
              Serving Size:{" "}
              {editing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedResult.servingSize}
                  onChangeText={(text) =>
                    setEditedResult({ ...editedResult, servingSize: text })
                  }
                  placeholder="Serving size"
                />
              ) : (
                result.servingSize
              )}
            </Text>

            <Text style={styles.confidence}>
              Confidence: {result.confidence}%
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          {!editing ? (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#4F46E5" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled,
                ]}
                onPress={onSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetEditing}
              >
                <Ionicons name="close" size={20} color="white" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled,
                ]}
                onPress={handleEdit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function NutritionItem({ label, value, unit, editing, onEdit }) {
  return (
    <View style={styles.nutritionItem}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.nutritionEditInput}
          value={value.toString()}
          onChangeText={onEdit}
          keyboardType="numeric"
          placeholder="0"
        />
      ) : (
        <Text style={styles.nutritionValue}>
          {value} {unit}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Math.min(24, screenWidth * 0.06),
    fontWeight: "bold",
    color: "white",
  },
  locationText: {
    color: "white",
    opacity: 0.8,
    marginTop: 5,
    fontSize: Math.min(14, screenWidth * 0.035),
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: screenHeight * 0.6,
  },
  camera: {
    flex: 1,
    minHeight: 200,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  cameraPlaceholderText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 15,
  },
  flipButton: {
    alignSelf: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 25,
  },
  viewfinderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  viewfinder: {
    width: Math.min(250, screenWidth * 0.6),
    height: Math.min(250, screenWidth * 0.6),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
    paddingVertical: 20,
    backgroundColor: "white",
    minHeight: 100,
  },
  galleryButton: {
    width: Math.min(60, screenWidth * 0.12),
    height: Math.min(60, screenWidth * 0.12),
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: Math.min(12, screenWidth * 0.03),
    color: "#4F46E5",
    marginTop: 2,
    fontWeight: "600",
  },
  captureButton: {
    width: Math.min(80, screenWidth * 0.16),
    height: Math.min(80, screenWidth * 0.16),
    borderRadius: Math.min(40, screenWidth * 0.08),
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: Math.min(60, screenWidth * 0.12),
    height: Math.min(60, screenWidth * 0.12),
    borderRadius: Math.min(30, screenWidth * 0.06),
    backgroundColor: "white",
  },
  placeholder: {
    width: Math.min(60, screenWidth * 0.12),
    height: Math.min(60, screenWidth * 0.12),
    justifyContent: "center",
    alignItems: "center",
  },
  instructionText: {
    fontSize: Math.min(10, screenWidth * 0.025),
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 12,
  },
  noPermissionText: {
    textAlign: "center",
    fontSize: Math.min(18, screenWidth * 0.045),
    color: "#666",
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionButtonText: {
    color: "white",
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    minHeight: 60,
  },
  modalTitle: {
    fontSize: Math.min(20, screenWidth * 0.05),
    fontWeight: "bold",
    color: "#4F46E5",
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  resultCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodName: {
    fontSize: Math.min(24, screenWidth * 0.06),
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 15,
    textAlign: "center",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 70,
    justifyContent: "center",
  },
  nutritionLabel: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#6B7280",
    marginBottom: 5,
  },
  nutritionValue: {
    fontSize: Math.min(18, screenWidth * 0.045),
    fontWeight: "bold",
    color: "#4F46E5",
  },
  nutritionEditInput: {
    fontSize: Math.min(18, screenWidth * 0.045),
    fontWeight: "bold",
    color: "#4F46E5",
    borderBottomWidth: 1,
    borderBottomColor: "#4F46E5",
    textAlign: "center",
    minWidth: 60,
    paddingVertical: 2,
  },
  servingSize: {
    fontSize: Math.min(16, screenWidth * 0.04),
    color: "#6B7280",
    marginBottom: 10,
    textAlign: "center",
  },
  confidence: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#6B7280",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 20,
    gap: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 50,
  },
  editButtonText: {
    color: "#4F46E5",
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 50,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 50,
  },
  cancelButtonText: {
    color: "white",
    fontSize: Math.min(16, screenWidth * 0.04),
    fontWeight: "600",
  },
  editInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#4F46E5",
    fontSize: Math.min(16, screenWidth * 0.04),
    textAlign: "center",
    minWidth: 100,
    paddingVertical: 2,
  },
});
