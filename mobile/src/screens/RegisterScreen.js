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

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
    } catch (err) {
      Alert.alert("Registration Error", err.message || "Failed to create account.");
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
          <Text style={styles.subtitle}>Create your free account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkText}>Log In</Text>
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
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FF6A00"
  },
  brandTitleSub: {
    color: "#2C2A29"
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 4
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
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
    marginTop: 10
  },
  input: {
    backgroundColor: "#F4F3EF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginTop: 18
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
