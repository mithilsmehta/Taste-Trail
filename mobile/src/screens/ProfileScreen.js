import React, { useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

export default function ProfileScreen({ navigation }) {
  const { user, token, logout, setUser } = useContext(AuthContext);
  const [isJain, setIsJain] = useState(user?.dietaryPreferences?.isJain || false);
  const [loading, setLoading] = useState(false);

  const toggleJain = async (value) => {
    setIsJain(value);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dietaryPreferences: { ...user?.dietaryPreferences, isJain: value }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user || { ...user, dietaryPreferences: { ...user?.dietaryPreferences, isJain: value } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || "TasteWise User"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
        {Boolean(user?.phone) && <Text style={styles.userPhone}>{user.phone}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>DIETARY PREFERENCES</Text>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Pure Jain Recipes</Text>
            <Text style={styles.rowSub}>Exclude onion, garlic, & underground roots</Text>
          </View>
          <Switch value={isJain} onValueChange={toggleJain} trackColor={{ false: "#DDD", true: "#FF6A00" }} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>MY ACCOUNT</Text>

        <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("SavedRecipes")}>
          <Text style={styles.optionText}>❤️ Saved Recipes</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("MealPlanner")}>
          <Text style={styles.optionText}>📅 Meal Planner</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("GroceryList")}>
          <Text style={styles.optionText}>🛒 Grocery List</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
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
  profileHeader: {
    alignItems: "center",
    marginBottom: 24
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF6A00",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  avatarText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "800"
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2A29"
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2
  },
  userPhone: {
    fontSize: 13,
    color: "#888",
    marginTop: 2
  },
  card: {
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
  cardHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#506950",
    letterSpacing: 1,
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333"
  },
  rowSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F4F3EF"
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333"
  },
  chevron: {
    fontSize: 20,
    color: "#CCC"
  },
  logoutBtn: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E53935",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40
  },
  logoutBtnText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "700"
  }
});
