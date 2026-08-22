import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

const genderOptions = ["Male", "Female", "Other"];
const foodPrefOptions = ["Jain", "Veg", "Vegan"];
const servingsOptions = ["1", "2", "3", "4", "5+"];
const ethnicityOptions = [
  "Gujarat",
  "Maharashtra",
  "Punjab",
  "South Indian",
  "Rajasthan",
  "North Indian",
  "Bengal",
  "Other"
];

export default function ProfileScreen({ navigation }) {
  const { user, token, logout, setUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top || 30) + 12;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Form States
  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [gender, setGender] = useState(user?.onboarding?.gender || "");
  const [foodPreference, setFoodPreference] = useState(user?.onboarding?.foodPreference || user?.preferences?.diet || "Jain");
  const [usualServings, setUsualServings] = useState(String(user?.onboarding?.usualServings || "2"));
  const [ethnicity, setEthnicity] = useState(user?.onboarding?.ethnicity || "");
  const [healthyGoal, setHealthyGoal] = useState(user?.onboarding?.healthyGoal || 50);
  const [heightCm, setHeightCm] = useState(user?.onboarding?.heightCm ? String(user.onboarding.heightCm) : "");
  const [weightKg, setWeightKg] = useState(user?.onboarding?.weightKg ? String(user.onboarding.weightKg) : "");

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Dropdown Picker Modal States
  const [pickerConfig, setPickerConfig] = useState({ visible: false, title: "", options: [], onSelect: null });

  // Calculate BMI
  const calculateBMI = () => {
    const h = Number(heightCm) / 100;
    const w = Number(weightKg);
    if (h > 0 && w > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return "--";
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const bmiValue = calculateBMI();
      const res = await fetch(`${API_BASE_URL}/api/auth/update-profile/${user._id || user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          onboarding: {
            gender,
            ethnicity,
            foodPreference,
            dietaryPreference: foodPreference,
            usualServings: Number(usualServings) || 2,
            healthyGoal,
            heightCm: Number(heightCm) || null,
            weightKg: Number(weightKg) || null,
            bmi: bmiValue !== "--" ? Number(bmiValue) : null
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.msg || "Failed to update profile");
      }

      setUser(data.user || { ...user, firstName, lastName, phone, onboarding: data.user?.onboarding });
      setIsEditing(false);
      Alert.alert("Success! 🎉", "Profile updated successfully.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Required", "Please enter both current and new password.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password/${user._id || user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.msg || "Password change failed");
      }

      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Success! 🔒", "Password updated successfully.");
    } catch (err) {
      Alert.alert("Password Error", err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const openPicker = (title, options, onSelect) => {
    if (!isEditing) return;
    setPickerConfig({ visible: true, title, options, onSelect });
  };

  return (
    <View style={styles.container}>
      {/* BRAND LOGO HEADER */}
      <View style={[styles.brandHeader, { paddingTop: topPadding }]}>
        <Text style={styles.brandTitle}>
          Taste<Text style={styles.brandTitleSub}>wise</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Your Profile</Text>

        {/* 1. UPDATE INFO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Update Info</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                if (isEditing) {
                  handleSaveProfile();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.sage} size="small" />
              ) : (
                <Text style={styles.editBtnText}>{isEditing ? "Save" : "Edit"}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FIRST NAME */}
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={firstName}
            onChangeText={setFirstName}
            editable={isEditing}
          />

          {/* LAST NAME */}
          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={lastName}
            onChangeText={setLastName}
            editable={isEditing}
          />

          {/* PHONE */}
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={isEditing}
          />

          {/* EMAIL */}
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
          />

          {/* GENDER */}
          <Text style={styles.fieldLabel}>Gender</Text>
          <TouchableOpacity
            style={[styles.dropdownInput, !isEditing && styles.inputDisabled]}
            onPress={() => openPicker("Select Gender", genderOptions, setGender)}
          >
            <Text style={styles.dropdownText}>{gender || "Select gender"}</Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>

          {/* FOOD PREFERENCE */}
          <Text style={styles.fieldLabel}>Food Preference</Text>
          <TouchableOpacity
            style={[styles.dropdownInput, !isEditing && styles.inputDisabled]}
            onPress={() => openPicker("Select Food Preference", foodPrefOptions, setFoodPreference)}
          >
            <Text style={styles.dropdownText}>{foodPreference || "Jain"}</Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>

          {/* HOW MANY PEOPLE DO YOU USUALLY COOK FOR? */}
          <Text style={styles.fieldLabel}>How many people do you usually cook for?</Text>
          <TouchableOpacity
            style={[styles.dropdownInput, !isEditing && styles.inputDisabled]}
            onPress={() => openPicker("Select Servings", servingsOptions, setUsualServings)}
          >
            <Text style={styles.dropdownText}>{usualServings || "2"}</Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>

          {/* ETHNICITY */}
          <Text style={styles.fieldLabel}>Ethnicity</Text>
          <TouchableOpacity
            style={[styles.dropdownInput, !isEditing && styles.inputDisabled]}
            onPress={() => openPicker("Select State/Ethnicity", ethnicityOptions, setEthnicity)}
          >
            <Text style={styles.dropdownText}>{ethnicity || "Select state"}</Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>

          {/* HEALTHY GOAL SLIDER BOX */}
          <View style={styles.sliderBox}>
            <View style={styles.sliderHeaderRow}>
              <Text style={{ fontSize: 18 }}>💔</Text>
              <Text style={styles.sliderPercentage}>{healthyGoal}%</Text>
              <Text style={{ fontSize: 18 }}>💚</Text>
            </View>
            <View style={styles.sliderTrack}>
              <TouchableOpacity
                style={[styles.sliderFill, { width: `${healthyGoal}%` }]}
                activeOpacity={1}
              />
            </View>
            {isEditing && (
              <View style={styles.sliderStepRow}>
                {[25, 50, 75, 100].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.stepPill}
                    onPress={() => setHealthyGoal(val)}
                  >
                    <Text style={styles.stepPillText}>{val}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* HEIGHT (CM) */}
          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="e.g. 170"
            editable={isEditing}
          />

          {/* WEIGHT (KG) */}
          <Text style={styles.fieldLabel}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            placeholder="e.g. 68"
            editable={isEditing}
          />

          {/* BMI */}
          <Text style={styles.fieldLabel}>BMI</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={calculateBMI()}
            editable={false}
          />
        </View>

        {/* 2. CHANGE PASSWORD CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitleCenter}>Change Password</Text>

          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity
            style={styles.darkActionBtn}
            onPress={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.darkActionBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. TASTEWISE PREMIUM CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitleLeft}>Tastewise Premium</Text>
          <Text style={styles.cardDesc}>
            Free account. Premium will remove ads and unlock more cooking tools.
          </Text>
          <TouchableOpacity style={styles.greenActionBtn}>
            <Text style={styles.greenActionBtnText}>View Premium</Text>
          </TouchableOpacity>
        </View>

        {/* 4. MEAL PLANNER VIEW CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitleLeft}>Meal Planner View</Text>
          <Text style={styles.cardDesc}>Choose which planner layout opens by default.</Text>
        </View>

        {/* 5. LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DROPDOWN PICKER MODAL */}
      <Modal visible={pickerConfig.visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerConfig({ ...pickerConfig, visible: false })}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{pickerConfig.title}</Text>
            {pickerConfig.options.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.pickerOption}
                onPress={() => {
                  if (pickerConfig.onSelect) pickerConfig.onSelect(option);
                  setPickerConfig({ ...pickerConfig, visible: false });
                }}
              >
                <Text style={styles.pickerOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  brandHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.orange
  },
  brandTitleSub: {
    color: colors.ink
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginVertical: 14
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink
  },
  cardTitleCenter: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 16
  },
  cardTitleLeft: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: 16
  },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.sage
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 10,
    marginBottom: 6
  },
  input: {
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink
  },
  inputDisabled: {
    backgroundColor: "#EAECEF",
    color: "#666"
  },
  dropdownInput: {
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dropdownText: {
    fontSize: 15,
    color: colors.ink
  },
  dropdownArrow: {
    fontSize: 16,
    color: "#666"
  },
  sliderBox: {
    backgroundColor: "#EBF0EB",
    borderRadius: 16,
    padding: 16,
    marginVertical: 14
  },
  sliderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  sliderPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.sage
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#D6E4D6",
    borderRadius: 4,
    overflow: "hidden"
  },
  sliderFill: {
    height: "100%",
    backgroundColor: colors.sage
  },
  sliderStepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  stepPill: {
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.sage
  },
  darkActionBtn: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14
  },
  darkActionBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700"
  },
  greenActionBtn: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center"
  },
  greenActionBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700"
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  pickerContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 16,
    textAlign: "center"
  },
  pickerOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center"
  }
});
