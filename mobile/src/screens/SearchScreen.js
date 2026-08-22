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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

const suggestedRecipes = [
  "Paneer Tikka",
  "Masala Dosa",
  "Veg Biryani",
  "Rajma Chawal",
  "Chole Bhature",
  "Palak Paneer",
  "Veg Hakka Noodles",
  "Margherita Pizza",
  "Dhokla",
  "Pav Bhaji",
  "Upma",
  "Vegetable Pasta"
];

const quickGroups = [
  { label: "Breakfast", query: "healthy breakfast", icon: "🥣" },
  { label: "Indian", query: "Indian dinner", icon: "🍛" },
  { label: "Quick", query: "quick vegetarian recipe", icon: "⚡" },
  { label: "Dessert", query: "eggless dessert", icon: "🍰" }
];

export default function SearchScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top || 30) + 12;

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query.trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: q, prompt: q })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || "Recipe search failed");
      }

      setSelectedRecipe(data.recipe);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to search recipe");
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
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Search Recipes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBox}>
          <Text style={styles.heroSub}>Find a recipe</Text>
          <Text style={styles.heroTitle}>What are you craving?</Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            autoFocus
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => handleSearch()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* QUICK GROUPS */}
        <View style={styles.quickGroupRow}>
          {quickGroups.map((group) => (
            <TouchableOpacity
              key={group.label}
              style={styles.quickGroupCard}
              onPress={() => {
                setQuery(group.label);
                handleSearch(group.query);
              }}
            >
              <Text style={styles.quickGroupIcon}>{group.icon}</Text>
              <Text style={styles.quickGroupLabel}>{group.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SUGGESTED RECIPES LIST */}
        <Text style={styles.sectionTitle}>Suggested Recipes</Text>
        <View style={styles.suggestionList}>
          {suggestedRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe}
              style={styles.suggestionItem}
              onPress={() => {
                setQuery(recipe);
                handleSearch(recipe);
              }}
            >
              <Text style={styles.suggestionText}>{recipe}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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

              <Text style={styles.modalSectionTitle}>Ingredients</Text>
              {selectedRecipe.ingredients?.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
              ))}

              <Text style={styles.modalSectionTitle}>Cooking Instructions</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center"
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
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  heroBox: {
    marginBottom: 16
  },
  heroSub: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1.2
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4
  },
  searchCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 10
  },
  searchBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14
  },
  searchBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14
  },
  quickGroupRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24
  },
  quickGroupCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  quickGroupIcon: {
    fontSize: 20,
    marginBottom: 4
  },
  quickGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 14
  },
  suggestionList: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  suggestionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink
  },
  chevron: {
    fontSize: 18,
    color: colors.muted
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
  modalSectionTitle: {
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
