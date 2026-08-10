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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* HEADER GREETING */}
      <View style={styles.header}>
        <Text style={styles.greetingTag}>GOOD AFTERNOON</Text>
        <Text style={styles.mainTitle}>
          What shall we <Text style={styles.titleHighlight}>cook</Text> today, {firstName}?
        </Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchCard}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search 12,000+ recipes or ingredients..."
          placeholderTextColor="#888"
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
          style={[styles.featureCard, { backgroundColor: "#506950" }]}
          onPress={() => navigation.navigate("DetectIngredients")}
        >
          <Text style={styles.badgeText}>AI POWERED</Text>
          <Text style={styles.featureTitle}>Detect Ingredients</Text>
          <Text style={styles.featureDesc}>
            Take a photo of your fridge ingredients & generate instant recipes!
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: "#D48B38" }]}
          onPress={() => navigation.navigate("MealPlanner")}
        >
          <Text style={styles.badgeText}>SMART PLANNER</Text>
          <Text style={styles.featureTitle}>Meal Planner</Text>
          <Text style={styles.featureDesc}>
            Organize your weekly breakfast, lunch, and dinner schedule.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: "#3C5A76" }]}
          onPress={() => navigation.navigate("GroceryList")}
        >
          <Text style={styles.badgeText}>INSTANT LIST</Text>
          <Text style={styles.featureTitle}>Grocery Checklist</Text>
          <Text style={styles.featureDesc}>
            Automated ingredients breakdown by category for grocery shopping.
          </Text>
        </TouchableOpacity>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F8F6"
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50
  },
  header: {
    marginBottom: 20
  },
  greetingTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#506950",
    letterSpacing: 1.5,
    marginBottom: 6
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: "#2C2A29",
    lineHeight: 38
  },
  titleHighlight: {
    color: "#506950",
    fontStyle: "italic"
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#333"
  },
  searchButton: {
    backgroundColor: "#FF6A00",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444"
  },
  cardContainer: {
    gap: 16
  },
  featureCard: {
    borderRadius: 20,
    padding: 24
  },
  badgeText: {
    color: "rgba(255,255,255,0.7)",
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
    color: "#FF6A00"
  },
  modalRecipeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2A29",
    marginTop: 10
  },
  modalRecipeDesc: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    lineHeight: 22
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#506950",
    marginTop: 24,
    marginBottom: 12
  },
  ingredientItem: {
    fontSize: 15,
    color: "#333",
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
    backgroundColor: "#FF6A00",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "700",
    marginRight: 12
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 22
  },
  saveBtn: {
    backgroundColor: "#506950",
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
