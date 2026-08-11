import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.emptyTitle}>No saved recipes yet</Text>
          <Text style={styles.emptySub}>Generate or search recipes to save your favorites here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {recipes.map((item, idx) => (
            <TouchableOpacity
              key={item._id || idx}
              style={styles.card}
              onPress={() => setSelectedRecipe(item)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              {Boolean(item.description) && (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={styles.ingredientCount}>
                {item.ingredients?.length || 0} ingredients • {item.steps?.length || 0} steps
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FULL RECIPE MODAL */}
      <Modal visible={Boolean(selectedRecipe)} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          {selectedRecipe && (
            <>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedRecipe(null)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
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
    marginTop: 10
  },
  emptyContainer: {
    flex: 1,
    justify.content: "center",
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
  }
});
