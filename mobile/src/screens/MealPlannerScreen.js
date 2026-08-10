import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

const mealTypes = [
  { id: "breakfast", label: "Breakfast", icon: "🥣" },
  { id: "lunch", label: "Lunch", icon: "🍱" },
  { id: "dinner", label: "Dinner", icon: "🍽️" }
];

export default function MealPlannerScreen() {
  const { token } = useContext(AuthContext);
  const [mealPlans, setMealPlans] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const fetchMealPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMealPlans(data);
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
        <Text style={styles.title}>Weekly Meal Plan</Text>
        <Text style={styles.subtitle}>Organize your daily meals & recipes</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {mealTypes.map((type) => (
            <View key={type.id} style={styles.mealSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{type.icon}</Text>
                <Text style={styles.sectionTitle}>{type.label}</Text>
              </View>

              {Array.isArray(mealPlans[type.id]) && mealPlans[type.id].some(slot => slot.length > 0) ? (
                mealPlans[type.id].map((daySlot, dIdx) => (
                  daySlot.map((plan, pIdx) => (
                    <View key={`${dIdx}-${pIdx}`} style={styles.mealCard}>
                      <Text style={styles.recipeName}>{plan.recipe?.title}</Text>
                      <Text style={styles.planDateText}>Date: {plan.planDate}</Text>
                    </View>
                  ))
                ))
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptyText}>No {type.label.toLowerCase()} planned yet</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
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
    borderColor: "#E6E4DD"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2C2A29"
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  scrollContent: {
    padding: 16
  },
  mealSection: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#506950"
  },
  mealCard: {
    backgroundColor: "#F4F3EF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  recipeName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333"
  },
  planDateText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4
  },
  emptySlot: {
    padding: 14,
    alignItems: "center"
  },
  emptyText: {
    color: "#AAA",
    fontSize: 14
  }
});
