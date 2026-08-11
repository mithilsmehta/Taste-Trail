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
  Alert
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";
import HeaderBar from "../components/HeaderBar";

const popularChips = [
  "Paneer Tikka",
  "Chinese Bhel",
  "Masala Dosa",
  "Jain Special",
  "Healthy Salad",
  "Quick Pasta"
];

export default function HomeScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerateRecipe = async (queryText) => {
    const searchQuery = queryText || prompt.trim();
    if (!searchQuery) {
      Alert.alert("Input Needed", "Please enter a dish name or ingredient prompt.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: searchQuery })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || "Recipe generation failed");
      }

      setRecipe(data.recipe);
      setModalVisible(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(recipe)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || "Save failed");
      }

      Alert.alert("Saved! ❤️", `"${recipe.title}" saved to your recipe collection.`);
    } catch (err) {
      Alert.alert("Save Error", err.message || "Could not save recipe");
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "Chef";

  return (
    <View style={styles.container}>
      <HeaderBar navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HERO TITLE */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingLabel}>GOOD AFTERNOON</Text>
          <Text style={styles.heroTitle}>
            What shall we <Text style={styles.heroItalic}>cook</Text> today, {firstName}?
          </Text>
        </View>

        {/* SEARCH CARD */}
        <View style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search 12,000+ recipes or ingredients..."
            placeholderTextColor={colors.muted}
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={() => handleGenerateRecipe()}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleGenerateRecipe()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Generate</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* QUICK SUGGESTIONS CHIPS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {popularChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chip}
              onPress={() => {
                setPrompt(chip);
                handleGenerateRecipe(chip);
              }}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FEATURE CARDS */}
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.cardGreen }]}
            onPress={() => navigation.navigate("DetectIngredients")}
          >
            <Text style={styles.badgeText}>AI POWERED</Text>
            <Text style={styles.featureTitle}>Detect Ingredients</Text>
            <Text style={styles.featureDesc}>
              Take a photo of your fridge ingredients & generate instant recipes!
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.cardOrange }]}
            onPress={() => navigation.navigate("Meal Plan")}
          >
            <Text style={styles.badgeText}>SMART PLANNER</Text>
            <Text style={styles.featureTitle}>Meal Planner</Text>
            <Text style={styles.featureDesc}>
              Organize your weekly breakfast, lunch, and dinner schedule.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.cardBlue }]}
            onPress={() => navigation.navigate("Grocery")}
          >
            <Text style={styles.badgeText}>INSTANT LIST</Text>
            <Text style={styles.featureTitle}>Grocery Checklist</Text>
            <Text style={styles.featureDesc}>
              Automated ingredients breakdown by category for grocery shopping.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* RECIPE DETAILS MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          {recipe && (
            <>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>

              <Text style={styles.modalRecipeTitle}>{recipe.title}</Text>
              {Boolean(recipe.description) && (
                <Text style={styles.modalRecipeDesc}>{recipe.description}</Text>
              )}

              <Text style={styles.sectionHeader}>Ingredients</Text>
              {recipe.ingredients?.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>
                  • {ing}
                </Text>
              ))}

              <Text style={styles.sectionHeader}>Step-by-Step Instructions</Text>
              {recipe.steps?.map((step, sIdx) => (
                <View key={sIdx} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{sIdx + 1}</Text>
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
    </View>
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
  heroSection: {
    marginBottom: 20
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1.5,
    marginBottom: 6
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 38
  },
  heroItalic: {
    color: colors.sage,
    fontStyle: "italic"
  },
  searchCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.ink
  },
  searchButton: {
    backgroundColor: colors.orange,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14
  },
  searchButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14
  },
  chipRow: {
    marginBottom: 24
  },
  chip: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink
  },
  cardContainer: {
    gap: 16
  },
  featureCard: {
    borderRadius: 22,
    padding: 24
  },
  badgeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1
  },
  featureTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6
  },
  featureDesc: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20
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
    color: colors.orange
  },
  modalRecipeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 10
  },
  modalRecipeDesc: {
    fontSize: 15,
    color: colors.subtext,
    marginTop: 8,
    lineHeight: 22
  },
  sectionHeader: {
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
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orange,
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
