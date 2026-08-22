import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Dimensions
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

const defaultFeaturedRecipes = [
  {
    _id: "feat-1",
    title: "Jain Manchurian Gravy",
    description: "Jain Manchurian Gravy walks in with main-character energy: smoky, creamy & rich.",
    ingredients: ["Cabbage", "Cornstarch", "Soy Sauce", "Green Chili", "Bell Pepper", "Capsicum", "Tomato Ketchup", "Sesame Oil", "Ginger Powder", "Salt", "Pepper", "Spring Greens", "Water", "Oil", "Chili Sauce", "Vinegar"],
    steps: [
      "Mix finely shredded cabbage with cornstarch, salt, and pepper to make small Manchurian balls.",
      "Deep fry or air-fry Manchurian balls until golden brown.",
      "Prepare gravy by heating oil, adding chili, soy sauce, ketchup, and ginger powder.",
      "Add cornstarch slurry to thicken sauce.",
      "Toss fried Manchurian balls in gravy and serve hot."
    ],
    difficulty: "Moderate",
    bgTop: "#FDE8D7",
    icon: "🍛"
  },
  {
    _id: "feat-2",
    title: "Jain Masala Dosa",
    description: "South Indian engineering at its finest: humble batter becomes Jain Masala Dosa and suddenly breakfast has a fan club.",
    ingredients: ["Rice", "Urad Dal", "Fenugreek Seeds", "Raw Banana", "Tomato", "Curry Leaves", "Mustard Seeds", "Turmeric Powder", "Coriander Powder", "Coconut Chutney"],
    steps: [
      "Soak rice, urad dal, and fenugreek seeds for 6 hours, blend into smooth batter and ferment overnight.",
      "Boil raw banana until tender, then mash with tomatoes, mustard seeds, curry leaves, and spices.",
      "Spread batter on a hot griddle into crisp golden dosas.",
      "Fill with raw banana masala, fold, and serve hot with coconut chutney."
    ],
    difficulty: "Easy",
    bgTop: "#E8F5E9",
    icon: "🍱"
  }
];

const popularChips = ["Paneer Tikka", "Masala Dosa", "Veg Biryani", "Chinese Bhel", "Jain Special"];

const categoryItems = [
  { label: "Indian", icon: "🍛", query: "Indian dish" },
  { label: "Breakfast", icon: "🥣", query: "Breakfast recipe" },
  { label: "Italian", icon: "🍝", query: "Italian pasta" },
  { label: "Dessert", icon: "🍰", query: "Sweet dessert" }
];

export default function HomeScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic MongoDB Counts
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlansCount, setMealPlansCount] = useState(0);
  const [groceryCount, setGroceryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isFocused) {
      fetchDashboardData();
    }
  }, [isFocused]);

  const fetchDashboardData = async () => {
    try {
      // 1. Saved Recipes from MongoDB
      const savedRes = await fetch(`${API_BASE_URL}/api/recipes/my-recipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const savedData = await savedRes.json();
      if (savedRes.ok && Array.isArray(savedData)) {
        setSavedRecipes(savedData);
      }

      // 2. Meal Plans from MongoDB
      const mealRes = await fetch(`${API_BASE_URL}/api/meal-plans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mealData = await mealRes.json();
      if (mealRes.ok && Array.isArray(mealData)) {
        setMealPlansCount(mealData.length);
        const totalGrocery = mealData.reduce(
          (acc, p) => acc + (p.recipe?.ingredients?.length || 0),
          0
        );
        setGroceryCount(totalGrocery);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateRecipe = async (queryText) => {
    const searchQuery = String(queryText || prompt || "").trim();
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
        body: JSON.stringify({ query: searchQuery, prompt: searchQuery })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || "Recipe generation failed");
      }

      setGeneratedRecipe(data.recipe);
      setModalVisible(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(generatedRecipe)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || "Save failed");
      }

      Alert.alert("Saved! ❤️", `"${generatedRecipe.title || generatedRecipe.name}" saved to your cookbook.`);
      fetchDashboardData();
    } catch (err) {
      Alert.alert("Save Error", err.message || "Could not save recipe");
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.name ? user.name.split(" ")[0].toLowerCase() : "mithil";
  const featuredList = savedRecipes.length > 0 ? savedRecipes : defaultFeaturedRecipes;
  const topPadding = (insets.top || 30) + 12;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.sage]} />
        }
      >
        {/* 1. GREETING & HERO TITLE */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingLabel}>GOOD EVENING</Text>
          <Text style={styles.heroTitle}>
            What shall we <Text style={styles.heroItalic}>cook</Text>
            {"\n"}today, {firstName}?
          </Text>
        </View>

        {/* 2. SEARCH BAR WITH GREEN SEARCH ICON BUTTON */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLeftIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search 12,000+ recipes..."
            placeholderTextColor={colors.muted}
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={() => handleGenerateRecipe()}
          />
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => handleGenerateRecipe()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.sage} size="small" />
            ) : (
              <Text style={{ fontSize: 16 }}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. SUGGESTION CHIPS ROW */}
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

        {/* 4. BIG GREEN FRIDGE CARD ("Generate a recipe from your fridge") */}
        <View style={styles.fridgeCard}>
          <View style={styles.aiBadge}>
            <View style={styles.aiDot} />
            <Text style={styles.aiBadgeText}>AI POWERED</Text>
          </View>

          <Text style={styles.fridgeTitle}>
            Generate a recipe{"\n"}from your <Text style={styles.fridgeItalic}>fridge</Text>
          </Text>

          <Text style={styles.fridgeSub}>
            Snap a photo of your ingredients and we'll create a recipe just for you.
          </Text>

          <TouchableOpacity
            style={styles.takePhotoButton}
            onPress={() => navigation.navigate("DetectIngredients")}
          >
            <Text style={styles.takePhotoText}>📷 Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* 5. BROWSE & SAVE CAROUSEL */}
        <View style={styles.topHeaderRow}>
          <Text style={styles.headerTitle}>Browse & Save</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SavedRecipes")}>
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          style={styles.carouselRow}
        >
          {featuredList.map((item, idx) => {
            const bgTop = item.bgTop || (idx % 2 === 0 ? "#E8F5E9" : "#FDE8D7");
            const icon = item.icon || (idx % 2 === 0 ? "🍱" : "🍛");

            return (
              <TouchableOpacity
                key={item._id || idx}
                style={styles.carouselCard}
                onPress={() => {
                  setGeneratedRecipe(item);
                  setModalVisible(true);
                }}
              >
                <View style={[styles.cardTopHalf, { backgroundColor: bgTop }]}>
                  <Text style={styles.cardEmoji}>{icon}</Text>
                  <View style={styles.heartCircle}>
                    <Text style={{ fontSize: 13 }}>❤️</Text>
                  </View>
                </View>

                <View style={styles.cardBottomHalf}>
                  <Text style={styles.badgeLabel}>SAVED RECIPE</Text>
                  <Text style={styles.recipeTitle} numberOfLines={1}>
                    {item.title || item.name}
                  </Text>
                  <Text style={styles.recipeSnippet} numberOfLines={2}>
                    {item.description || `${item.title || item.name} walks in with main-character energy: rich, authentic & delicious.`}
                  </Text>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.ingredientCount}>
                      {item.ingredients?.length || 10} ingredients
                    </Text>
                    <View style={styles.diffPill}>
                      <Text style={styles.diffPillText}>
                        {item.difficulty || "Moderate"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 6. SIDE-BY-SIDE ACTION CARDS */}
        <View style={styles.sideBySideRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Meal Plan")}
          >
            <View style={styles.actionCardHeader}>
              <View style={[styles.iconSquare, { backgroundColor: "#FDE8D7" }]}>
                <Text style={{ fontSize: 16 }}>📅</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.actionBadge}>PLAN AHEAD</Text>
                <Text style={styles.actionTitle}>Meal Planner</Text>
                <Text style={styles.actionSub}>{mealPlansCount} meals this week</Text>
              </View>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Grocery")}
          >
            <View style={styles.actionCardHeader}>
              <View style={[styles.iconSquare, { backgroundColor: "#E8F5E9" }]}>
                <Text style={{ fontSize: 16 }}>🛒</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.actionBadge}>SHOPPING</Text>
                <Text style={styles.actionTitle}>Grocery List</Text>
                <Text style={styles.actionSub}>{groceryCount} items</Text>
              </View>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 7. 2X2 CATEGORY GRID */}
        <View style={styles.categoryGrid}>
          {categoryItems.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.categoryPillCard}
              onPress={() => {
                setPrompt(cat.label);
                handleGenerateRecipe(cat.query);
              }}
            >
              <Text style={styles.catEmoji}>{cat.icon}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 8. SAVED RECIPES SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBadge}>SAVED RECIPES</Text>
          <Text style={styles.summaryTitle}>{savedRecipes.length} saved favorites</Text>

          <TouchableOpacity
            style={styles.cookbookBtn}
            onPress={() => navigation.navigate("SavedRecipes")}
          >
            <Text style={styles.cookbookBtnText}>Open cookbook</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* RECIPE DETAILS MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          {generatedRecipe && (
            <>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>

              <Text style={styles.modalRecipeTitle}>
                {generatedRecipe.title || generatedRecipe.name}
              </Text>
              {Boolean(generatedRecipe.description) && (
                <Text style={styles.modalRecipeDesc}>{generatedRecipe.description}</Text>
              )}

              <Text style={styles.sectionHeader}>Ingredients</Text>
              {generatedRecipe.ingredients?.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>
                  • {ing}
                </Text>
              ))}

              <Text style={styles.sectionHeader}>Step-by-Step Instructions</Text>
              {generatedRecipe.steps?.map((step, sIdx) => (
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
    padding: 18,
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
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  searchLeftIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.5
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 10
  },
  searchIconButton: {
    backgroundColor: "#EBF0EB",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center"
  },
  chipRow: {
    marginBottom: 20
  },
  chip: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.sage
  },
  fridgeCard: {
    backgroundColor: "#4E704F",
    borderRadius: 28,
    padding: 24,
    marginBottom: 28
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 16
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8BE396",
    marginRight: 6
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1
  },
  fridgeTitle: {
    fontSize: 30,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 36,
    marginBottom: 10
  },
  fridgeItalic: {
    fontStyle: "italic",
    fontWeight: "400"
  },
  fridgeSub: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.88)",
    lineHeight: 20,
    marginBottom: 20
  },
  takePhotoButton: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: "flex-start"
  },
  takePhotoText: {
    color: colors.sage,
    fontWeight: "800",
    fontSize: 14
  },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.sage
  },
  carouselRow: {
    marginBottom: 24
  },
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderRadius: 22,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  cardTopHalf: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  cardEmoji: {
    fontSize: 50
  },
  heartCircle: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  cardBottomHalf: {
    padding: 16
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1,
    marginBottom: 4
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6
  },
  recipeSnippet: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    marginBottom: 14
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ingredientCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.subtext
  },
  diffPill: {
    backgroundColor: "#FDE8D7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  diffPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D96B43"
  },
  sideBySideRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  actionBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 0.8
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2
  },
  actionSub: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2
  },
  arrowText: {
    fontSize: 18,
    color: colors.muted,
    marginLeft: 4
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20
  },
  categoryPillCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  catEmoji: {
    fontSize: 18,
    marginRight: 10
  },
  catLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink
  },
  summaryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20
  },
  summaryBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 6,
    marginBottom: 16
  },
  cookbookBtn: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: "flex-start"
  },
  cookbookBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700"
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
