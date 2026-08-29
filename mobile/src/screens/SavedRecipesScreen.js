import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

export default function SavedRecipesScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchSavedRecipes();
  }, []);

  const fetchSavedRecipes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/my-recipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRecipes(data);
      } else {
        setRecipes([]);
      }
    } catch (err) {
      console.error("Saved recipes fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id) => {
    Alert.alert("Delete Recipe", "Are you sure you want to remove this recipe from your cookbook?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
              setRecipes((prev) => prev.filter((r) => r._id !== id));
              if (selectedRecipe?._id === id) setSelectedRecipe(null);
            } else {
              const data = await res.json();
              Alert.alert("Delete Failed", data.msg || "Could not delete recipe");
            }
          } catch (err) {
            Alert.alert("Error", err.message || "Could not delete recipe");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Recipes</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.orange} style={{ marginTop: 40 }} />
      ) : recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyTitle}>No saved recipes in your database</Text>
          <Text style={styles.emptySub}>
            Search recipes on Home or use "Detect Ingredients" to save your favorites directly to MongoDB!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {recipes.map((item, idx) => (
            <View key={item._id || idx} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title || item.name}</Text>
              {Boolean(item.description) && (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={styles.ingredientCount}>
                {item.ingredients?.length || 0} ingredients • {item.steps?.length || 0} steps
              </Text>

              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => setSelectedRecipe(item)}
                >
                  <Text style={styles.viewBtnText}>👁️ View Recipe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteRecipe(item._id)}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* DETAILED RECIPE VIEW MODAL */}
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

              {/* NUTRITION BREAKDOWN GRID */}
              {selectedRecipe.nutrition && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionTitle}>NUTRITION FACTS</Text>
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionCard}>
                      <Text style={styles.nutritionValue}>{selectedRecipe.nutrition.calories || 0}</Text>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                    </View>
                    <View style={styles.nutritionCard}>
                      <Text style={styles.nutritionValue}>{selectedRecipe.nutrition.protein || 0}g</Text>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                    </View>
                    <View style={styles.nutritionCard}>
                      <Text style={styles.nutritionValue}>{selectedRecipe.nutrition.carbs || 0}g</Text>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                    </View>
                    <View style={styles.nutritionCard}>
                      <Text style={styles.nutritionValue}>{selectedRecipe.nutrition.fat || 0}g</Text>
                      <Text style={styles.nutritionLabel}>Fat</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>Ingredients ({selectedRecipe.ingredients?.length || 0})</Text>
              {selectedRecipe.ingredients?.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientItem}>{ing}</Text>
                </View>
              ))}

              <Text style={styles.sectionTitle}>Cooking Instructions</Text>
              {selectedRecipe.steps?.map((step, s) => (
                <View key={s} style={styles.stepRow}>
                  <Text style={styles.stepNum}>{s + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.planBtn}
                  onPress={() => {
                    setSelectedRecipe(null);
                    navigation.navigate("MainTabs", { screen: "Meal Plan" });
                  }}
                >
                  <Text style={styles.planBtnText}>📅 Add to Meal Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => deleteRecipe(selectedRecipe._id)}
                >
                  <Text style={styles.modalDeleteBtnText}>🗑️ Delete Recipe</Text>
                </TouchableOpacity>
              </View>
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
    paddingTop: 52,
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
    color: colors.orange
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  scrollContent: {
    padding: 16
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  cardDesc: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 20
  },
  ingredientCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.sage,
    marginTop: 8
  },
  cardActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  viewBtn: {
    flex: 1,
    backgroundColor: colors.orange,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  viewBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  },
  deleteBtn: {
    backgroundColor: "#FCE4E4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 13
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink
  },
  emptySub: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    marginTop: 6
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
  nutritionBox: {
    backgroundColor: colors.sageSoft,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(80, 105, 80, 0.2)"
  },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.sage,
    letterSpacing: 1,
    marginBottom: 10
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  nutritionCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  nutritionLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.sage,
    marginTop: 24,
    marginBottom: 12
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sage,
    marginRight: 10
  },
  ingredientItem: {
    fontSize: 15,
    color: colors.ink
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 14
  },
  stepNum: {
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
  modalActionRow: {
    gap: 12,
    marginTop: 30,
    marginBottom: 40
  },
  planBtn: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  planBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  },
  modalDeleteBtn: {
    backgroundColor: "#FCE4E4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center"
  },
  modalDeleteBtnText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700"
  }
});
