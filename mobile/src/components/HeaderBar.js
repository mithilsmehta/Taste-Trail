import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";

export default function HeaderBar({ navigation, showSaved = true }) {
  return (
    <View style={styles.header}>
      <Text style={styles.brandTitle}>
        Taste<Text style={styles.brandTitleSub}>wise</Text>
      </Text>
      {showSaved && (
        <TouchableOpacity
          style={styles.savedBtn}
          onPress={() => navigation.navigate("SavedRecipes")}
        >
          <Text style={styles.savedBtnText}>❤️ Saved</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.orange,
    letterSpacing: -0.5
  },
  brandTitleSub: {
    color: colors.ink
  },
  savedBtn: {
    backgroundColor: colors.orangeSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD0B8"
  },
  savedBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.orange
  }
});
