import React, { useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Image
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

export default function DetectIngredientsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top || 30) + 12;

  const [ingredientsText, setIngredientsText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [saving, setSaving] = useState(false);

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera permission is needed to snap a photo of your fridge ingredients.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
      analyzeImage(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
      analyzeImage(result.assets[0]);
    }
  };

  const analyzeImage = async (imageAsset) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/vision/detect-ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          image: imageAsset.base64 ? `data:image/jpeg;base64,${imageAsset.base64}` : imageAsset.uri
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || data.message || "Vision ingredient detection failed");
      }

      if (data.detectedIngredients) {
        setIngredientsText(data.detectedIngredients.join(", "));
      }

      if (Array.isArray(data.recipes) && data.recipes.length) {
        setRecipes(data.recipes);
      } else {
        handleDetect(data.detectedIngredients?.join(", "));
      }
    } catch (err) {
      Alert.alert("Vision AI Note", err.message || "Could not analyze photo. Enter ingredients manually below.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async (customIngredients) => {
    const query = customIngredients || ingredientsText.trim();
    if (!query) {
      Alert.alert("Input Required", "Enter ingredients you have at home (e.g. Tomato, Paneer, Capsicum)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/detect-ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ingredients: query })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || "Detection failed");
      }

      setRecipes(Array.isArray(data.recipes) ? data.recipes : data.recipe ? [data.recipe] : []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to generate recipes from ingredients");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipe) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(selectedRecipe)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || "Save failed");
      }

      Alert.alert("Saved! ❤️", `"${selectedRecipe.title || selectedRecipe.name}" saved to your cookbook.`);
    } catch (err) {
      Alert.alert("Save Error", err.message || "Could not save recipe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detect Ingredients</Text>
      </View>

      {/* PHOTO DETECTOR CARD */}
      <View style={styles.fridgeCard}>
        <View style={styles.aiBadge}>
          <View style={styles.aiDot} />
          <Text style={styles.aiBadgeText}>AI VISION DETECTOR</Text>
        </View>

        <Text style={styles.fridgeTitle}>Snap or Choose Photo</Text>
        <Text style={styles.fridgeSub}>Take a photo of your fridge ingredients to automatically detect items & generate recipes.</Text>

        {selectedImage && (
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} disabled={loading}>
            <Text style={styles.photoBtnText}>📷 Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoBtnOutline} onPress={pickImage} disabled={loading}>
            <Text style={styles.photoBtnOutlineText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MANUAL INGREDIENT LIST CARD */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>WHAT'S IN YOUR FRIDGE / PANTRY?</Text>
        <Text style={styles.cardSub}>List items you have, separated by commas:</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Tomato, Paneer, Capsicum, Schezwan Sauce..."
          placeholderTextColor={colors.muted}
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.btnDisabled]}
          onPress={() => handleDetect()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.actionBtnText}>⚡ Find Matching Recipes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RESULTS LIST */}
      {recipes.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>RECIPES YOU CAN MAKE ({recipes.length})</Text>
          {recipes.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.recipeCard}
              onPress={() => setSelectedRecipe(item)}
            >
              <Text style={styles.recipeTitle}>{item.title || item.name}</Text>
              {Boolean(item.description) && (
                <Text style={styles.recipeDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={styles.recipeMeta}>
                {item.ingredients?.length || 0} ingredients • {item.steps?.length || 0} steps
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* FULL RECIPE MODAL */}
      <Modal visible={Boolean(selectedRecipe)} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          {selectedRecipe && (
            <>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedRecipe(null)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{selectedRecipe.title || selectedRecipe.name}</Text>
              {Boolean(selectedRecipe.description) && (
                <Text style={styles.modalDesc}>{selectedRecipe.description}</Text>
              )}

              <Text style={styles.sectionTitle}>Ingredients</Text>
              {selectedRecipe.ingredients?.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
              ))}

              <Text style={styles.sectionTitle}>Cooking Instructions</Text>
              {selectedRecipe.steps?.map((step, s) => (
                <View key={s} style={styles.stepRow}>
                  <Text style={styles.stepNum}>{s + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveRecipe}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "❤️ Save Recipe"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20
  },
  backBtn: {
    marginRight: 16
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.sage
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink
  },
  fridgeCard: {
    backgroundColor: "#4E704F",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginBottom: 12
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8BE396",
    marginRight: 6
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1
  },
  fridgeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 6
  },
  fridgeSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
    marginBottom: 16
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  photoBtn: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  photoBtnText: {
    color: colors.sage,
    fontWeight: "800",
    fontSize: 14
  },
  photoBtnOutline: {
    borderWidth: 1,
    borderColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  photoBtnOutlineText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1
  },
  cardSub: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 4,
    marginBottom: 12
  },
  textArea: {
    backgroundColor: "#F4F3EF",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    height: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border
  },
  actionBtn: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16
  },
  btnDisabled: {
    opacity: 0.7
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  },
  resultsContainer: {
    marginTop: 24
  },
  resultsHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.subtext,
    letterSpacing: 1,
    marginBottom: 12
  },
  recipeCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  recipeDesc: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 20
  },
  recipeMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.sage,
    marginTop: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF"
  },
  modalContent: {
    padding: 24,
    paddingTop: 60
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 10
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.sage
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 10
  },
  modalDesc: {
    fontSize: 15,
    color: colors.subtext,
    marginTop: 8,
    lineHeight: 22
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.sage,
    marginTop: 24,
    marginBottom: 12
  },
  ingredientItem: {
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 4
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 14
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sage,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "700",
    marginRight: 12
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22
  },
  saveBtn: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
