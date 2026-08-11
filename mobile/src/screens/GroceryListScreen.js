import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

const CACHE_KEY = "tastewiseMobileGroceryCache";

const categoryTabs = [
  { id: "all", label: "All" },
  { id: "vegetables", label: "Vegetables" },
  { id: "grains", label: "Grains & Pulses" },
  { id: "snacks", label: "Kitchen Staples" }
];

const categoryPatterns = {
  vegetables: /\b(cabbage|capsicum|bell pepper|broccoli|lettuce|tomato|cucumber|coriander|cilantro|spinach|palak|methi|cauliflower|peas|beans|gourd|lauki|pumpkin|fruit|chilli|chili|leaves|vegetable|carrot|potato|onion|garlic)\b/i,
  grains: /\b(flour|wheat|rice|basmati|atta|dal|lentil|moong|chana|rajma|beans|pulses|oats|quinoa|millet|jowar|bajra|ragi|semolina|suji|noodles|pasta)\b/i,
  snacks: /\b(butter|cheese|paneer|pesto|pepper|masala|snack|chips|bread|buns|dry fruits|nuts|almond|cashew|raisins|sauce|chutney)\b/i
};

export default function GroceryListScreen() {
  const { token } = useContext(AuthContext);
  const [mealPlans, setMealPlans] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [newItem, setNewItem] = useState("");
  const [customItems, setCustomItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCachedGrocery();
    fetchGroceryData();
  }, []);

  const loadCachedGrocery = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setMealPlans(JSON.parse(cached));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroceryData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/meal-plans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMealPlans(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomItem = () => {
    if (!newItem.trim()) return;
    const item = { id: `custom-${Date.now()}`, name: newItem.trim() };
    setCustomItems((prev) => [item, ...prev]);
    setNewItem("");
  };

  // Collect all ingredients from planned meals
  const allIngredients = mealPlans.flatMap((plan, pIdx) =>
    (plan.recipe?.ingredients || []).map((ing, iIdx) => ({
      id: `${plan._id || pIdx}-${iIdx}`,
      name: ing,
      dish: plan.recipe?.title
    }))
  );

  const filteredIngredients = allIngredients.filter((item) => {
    if (filter === "all") return true;
    return categoryPatterns[filter]?.test(item.name);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery Checklist</Text>
        <Text style={styles.subtitle}>
          {allIngredients.length + customItems.length} items to buy
        </Text>

        {/* CATEGORY TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {categoryTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, filter === tab.id && styles.tabActive]}
              onPress={() => setFilter(tab.id)}
            >
              <Text style={[styles.tabText, filter === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.addInputRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Add custom item (e.g. Milk, Salt)..."
          placeholderTextColor="#999"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addCustomItem}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addCustomItem}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading && allIngredients.length === 0 ? (
        <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {customItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, checkedItems[item.id] && styles.itemCardChecked]}
              onPress={() => toggleCheck(item.id)}
            >
              <Text style={styles.checkbox}>{checkedItems[item.id] ? "☑" : "☐"}</Text>
              <Text style={[styles.itemName, checkedItems[item.id] && styles.itemCheckedText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}

          {filteredIngredients.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, checkedItems[item.id] && styles.itemCardChecked]}
              onPress={() => toggleCheck(item.id)}
            >
              <Text style={styles.checkbox}>{checkedItems[item.id] ? "☑" : "☐"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, checkedItems[item.id] && styles.itemCheckedText]}>
                  {item.name}
                </Text>
                {Boolean(item.dish) && <Text style={styles.dishTag}>For: {item.dish}</Text>}
              </View>
            </TouchableOpacity>
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
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E6E4DD"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2C2A29",
    paddingHorizontal: 20
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    paddingHorizontal: 20
  },
  tabRow: {
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F3EF",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  tabActive: {
    backgroundColor: "#506950",
    borderColor: "#506950"
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444"
  },
  tabTextActive: {
    color: "#FFF"
  },
  addInputRow: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    gap: 8
  },
  addInput: {
    flex: 1,
    backgroundColor: "#F4F3EF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14
  },
  addBtn: {
    backgroundColor: "#506950",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justify.content: "center"
  },
  addBtnText: {
    color: "#FFF",
    fontWeight: "700"
  },
  scrollContent: {
    padding: 16
  },
  itemCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  itemCardChecked: {
    backgroundColor: "#EFEFEF",
    opacity: 0.6
  },
  checkbox: {
    fontSize: 20,
    marginRight: 12,
    color: "#506950"
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333"
  },
  itemCheckedText: {
    textDecorationLine: "line-through",
    color: "#888"
  },
  dishTag: {
    fontSize: 11,
    color: "#888",
    marginTop: 2
  }
});
