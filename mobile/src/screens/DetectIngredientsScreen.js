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

export default function DetectIngredientsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [ingredientsText, setIngredientsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleDetect = async () => {
    if (!ingredientsText.trim()) {
      Alert.alert("Input Required", "Enter ingredients you have at home (e.g. Potato, Onion, Cheese)");
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
        body: JSON.stringify({ ingredients: ingredientsText })
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detect Ingredients</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>WHAT'S IN YOUR FRIDGE / PANTRY?</Text>
        <Text style={styles.cardSub}>List the items you have, separated by commas:</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Tomato, Paneer, Capsicum, Schezwan Sauce..."
          placeholderTextColor="#999"
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.btnDisabled]}
          onPress={handleDetect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.actionBtnText}>⚡ Find Matching Recipes</Text>
          )}
        </TouchableOpacity>
      </View>

      {recipes.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>RECIPES YOU CAN MAKE</Text>
          {recipes.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.recipeCard}
              onPress={() => setSelectedRecipe(item)}
            >
              <Text style={styles.recipeTitle}>{item.title}</Text>
              {Boolean(item.description) && (
                <Text style={styles.recipeDesc} numberOfLines={2}>{item.description}</Text>
              )}
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
    color: "#506950"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2A29"
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#506950",
    letterSpacing: 1
  },
  cardSub: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 12
  },
  textArea: {
    backgroundColor: "#F4F3EF",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#333",
    height: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  actionBtn: {
    backgroundColor: "#506950",
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
    color: "#888",
    letterSpacing: 1,
    marginBottom: 12
  },
  recipeCard: {
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
  recipeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2A29"
  },
  recipeDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
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
    color: "#506950"
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
    backgroundColor: "#506950",
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
