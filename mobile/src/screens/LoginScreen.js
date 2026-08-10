import React, { useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email/phone and password.");
      return;
    }

    setLoading(true);
    try {
      await login(emailOrPhone.trim(), password);
    } catch (err) {
      Alert.alert("Login Error", err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.brandTitle}>
            Taste<Text style={styles.brandTitleSub}>wise</Text>
          </Text>
          <Text style={styles.subtitle}>Welcome back! Sign in to your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email or Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email or phone number"
            placeholderTextColor="#999"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.linkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F8F6"
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FF6A00",
    letterSpacing: -1
  },
  brandTitleSub: {
    color: "#2C2A29"
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 6,
    textAlign: "center"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: "#F4F3EF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#E6E4DD"
  },
  button: {
    backgroundColor: "#FF6A00",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20
  },
  footerText: {
    color: "#666",
    fontSize: 14
  },
  linkText: {
    color: "#FF6A00",
    fontSize: 14,
    fontWeight: "700"
  }
});
