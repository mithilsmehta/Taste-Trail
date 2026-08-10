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
        <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 40 }} />
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
    backgroundColor: "#F9F8F6"
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E6E4DD",
    flexDirection: "row",
    alignItems: "center"
  },
  backBtn: {
    marginRight: 16
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6A00"
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2A29"
  },
  scrollContent: {
    padding: 16
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2A29"
  },
  cardDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    lineHeight: 20
  },
  ingredientCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#506950",
    marginTop: 10
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
    color: "#333"
  },
  emptySub: {
    fontSize: 14,
    color: "#888",
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
    color: "#FF6A00"
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2A29",
    marginTop: 10
  },
  modalDesc: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    lineHeight: 22
  },
  sectionTitle: {
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
  stepNum: {
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
  }
});
