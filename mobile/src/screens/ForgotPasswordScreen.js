import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top || 30) + 12;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Input Required", "Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { msg: text };
      }

      if (!res.ok) {
        throw new Error(data.msg || data.message || "Reset request failed");
      }

      Alert.alert("Link Sent! 📧", data.msg || "Check your email inbox for password reset instructions.", [
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.brandTitle}>
          Taste<Text style={styles.brandTitleSub}>wise</Text>
        </Text>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address and we'll send you a link to reset your password.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="name@example.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scrollContent: {
    padding: 24
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 20
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.sage
  },
  header: {
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.orange,
    marginBottom: 8
  },
  brandTitleSub: {
    color: colors.ink
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 6,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6
  },
  input: {
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 20
  },
  btn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
