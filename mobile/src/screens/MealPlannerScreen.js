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
import { getTodayDateKey, getMondayDateKey, getWeekFromMonday } from "../utils/weekPlan";

const mealTypes = [
  { id: "breakfast", label: "Breakfast", icon: "🥣", time: "08:00" },
  { id: "lunch", label: "Lunch", icon: "🍱", time: "13:00" },
  { id: "dinner", label: "Dinner", icon: "🍽️", time: "20:00" }
];

export default function MealPlannerScreen() {
  const { token } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const mondayKey = getMondayDateKey(selectedDate);
  const weekDays = getWeekFromMonday(mondayKey);

  const [mealPlans, setMealPlans] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [targetMealType, setTargetMealType] = useState("breakfast");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMealPlans();
    fetchSavedRecipes();
  }, [mondayKey]);

  const fetchMealPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/all?fromDate=${weekDays[0].dateKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMealPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedRecipes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/my-recipes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSavedRecipes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedDayPlans = mealPlans.filter((p) => p.planDate === selectedDate);

  const handleAddRecipeToMeal = async (recipe) => {
    setAdding(true);
    const dayIndex = weekDays.findIndex((d) => d.dateKey === selectedDate);
    try {
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: targetMealType,
          dayIndex: dayIndex >= 0 ? dayIndex : 0,
          planDate: selectedDate,
          recipe,
          time: mealTypes.find((m) => m.id === targetMealType)?.time || "12:00"
        })
      });

      const data = await res.json();
      if (res.ok && data.mealPlan) {
        setMealPlans((prev) => [...prev, data.mealPlan]);
        setAddModalVisible(false);
      } else {
        Alert.alert("Error", data.msg || "Failed to add meal plan");
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to add meal");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMealPlan = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMealPlans((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Meal Planner</Text>
        <Text style={styles.subtitle}>
          {weekDays[0].monthName} {weekDays[0].dayNumber} - {weekDays[6].monthName} {weekDays[6].dayNumber}
        </Text>

        {/* 7-DAY WEEK SELECTOR BAR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekBar}>
          {weekDays.map((day) => {
            const isSelected = day.dateKey === selectedDate;
            const hasMeals = mealPlans.some((p) => p.planDate === day.dateKey);

            return (
              <TouchableOpacity
                key={day.dateKey}
                style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                onPress={() => setSelectedDate(day.dateKey)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                  {day.dayName}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>
                  {day.dayNumber}
                </Text>
                {hasMeals && <View style={styles.hasMealDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {mealTypes.map((type) => {
            const plansForSlot = selectedDayPlans.filter((p) => p.mealType === type.id);

            return (
              <View key={type.id} style={styles.mealSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionIcon}>{type.icon}</Text>
                    <Text style={styles.sectionTitle}>{type.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addSlotBtn}
                    onPress={() => {
                      setTargetMealType(type.id);
                      setAddModalVisible(true);
                    }}
                  >
                    <Text style={styles.addSlotBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {plansForSlot.length > 0 ? (
                  plansForSlot.map((plan) => (
                    <View key={plan._id} style={styles.mealCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recipeName}>{plan.recipe?.title}</Text>
                        <Text style={styles.timeText}>Scheduled for {plan.time || type.time}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteMealPlan(plan._id)}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => {
                      setTargetMealType(type.id);
                      setAddModalVisible(true);
                    }}
                  >
                    <Text style={styles.emptyText}>+ Tap to plan {type.label.toLowerCase()}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ADD MEAL MODAL */}
      <Modal visible={addModalVisible} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setAddModalVisible(false)}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Choose Recipe to Add</Text>
          <Text style={styles.modalSubtitle}>
            Adding to {targetMealType.toUpperCase()} on {selectedDate}
          </Text>

          {savedRecipes.length === 0 ? (
            <View style={styles.noRecipesBox}>
              <Text style={styles.noRecipesText}>No saved recipes available.</Text>
              <Text style={styles.noRecipesSub}>
                Search or generate recipes on the Home tab first to save them here!
              </Text>
            </View>
          ) : (
            savedRecipes.map((recipe) => (
              <TouchableOpacity
                key={recipe._id}
                style={styles.selectRecipeCard}
                onPress={() => handleAddRecipeToMeal(recipe)}
                disabled={adding}
              >
                <Text style={styles.selectRecipeTitle}>{recipe.title}</Text>
                {Boolean(recipe.description) && (
                  <Text style={styles.selectRecipeDesc} numberOfLines={2}>
                    {recipe.description}
                  </Text>
                )}
                <Text style={styles.selectAddText}>+ Add to Meal Plan</Text>
              </TouchableOpacity>
            ))
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
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E6E4DD"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2A29",
    paddingHorizontal: 20
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    paddingHorizontal: 20
  },
  weekBar: {
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  dayCard: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F4F3EF",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  dayCardSelected: {
    backgroundColor: "#506950",
    borderColor: "#506950"
  },
  dayName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666"
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2A29",
    marginTop: 2
  },
  dayTextSelected: {
    color: "#FFF"
  },
  hasMealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF6A00",
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center"
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
  addSlotBtn: {
    backgroundColor: "#F4F3EF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  addSlotBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#506950"
  },
  mealCard: {
    backgroundColor: "#F4F3EF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  recipeName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333"
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    marginTop: 2
  },
  deleteBtn: {
    padding: 8
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E53935"
  },
  emptySlot: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E4DD",
    borderStyle: "dashed",
    alignItems: "center"
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600"
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
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2A29",
    marginTop: 10
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 20
  },
  noRecipesBox: {
    padding: 20,
    backgroundColor: "#F4F3EF",
    borderRadius: 14,
    alignItems: "center"
  },
  noRecipesText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333"
  },
  noRecipesSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 6
  },
  selectRecipeCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  selectRecipeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333"
  },
  selectRecipeDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4
  },
  selectAddText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6A00",
    marginTop: 10
  }
});
