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
import { colors } from "../theme/colors";
import HeaderBar from "../components/HeaderBar";

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
    <View style={styles.container}>
      <HeaderBar navigation={navigation} showSaved={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.rowTitle}>Pure Jain Recipes</Text>
              <Text style={styles.rowSub}>Exclude onion, garlic, & underground roots</Text>
            </View>
            <Switch
              value={isJain}
              onValueChange={toggleJain}
              trackColor={{ false: "#DDD", true: colors.orange }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>MY ACCOUNT</Text>

          <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("SavedRecipes")}>
            <Text style={styles.optionText}>❤️ Saved Recipes</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("Meal Plan")}>
            <Text style={styles.optionText}>📅 Meal Planner</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("Grocery")}>
            <Text style={styles.optionText}>🛒 Grocery List</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orange,
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
    color: colors.ink
  },
  userEmail: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 2
  },
  userPhone: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.sage,
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
    color: colors.ink
  },
  rowSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink
  },
  chevron: {
    fontSize: 20,
    color: colors.muted
  },
  logoutBtn: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "700"
  }
});
