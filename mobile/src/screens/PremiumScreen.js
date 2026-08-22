import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors } from "../theme/colors";

const plans = [
  { id: "premium_1_month", label: "1 Month", price: "₹99", badge: "Starter", note: "Renews monthly unless cancelled." },
  { id: "premium_3_month", label: "3 Months", price: "₹249", badge: "Flexible", note: "Renews every 3 months unless cancelled." },
  { id: "premium_6_month", label: "6 Months", price: "₹449", badge: "Popular", note: "Renews every 6 months unless cancelled." },
  { id: "premium_12_month", label: "12 Months", price: "₹799", badge: "Best Value", note: "Renews yearly unless cancelled." }
];

const benefits = [
  { icon: "🚫", title: "Ad-free cooking", copy: "Premium hides every Tastewise ad slot for your account." },
  { icon: "⚡", title: "More room to plan", copy: "Built for heavier saved recipe, meal planner, and grocery list use." },
  { icon: "🥗", title: "Nutrition focus", copy: "Prepared for deeper nutrition tools as the app grows." },
  { icon: "🌟", title: "Priority features", copy: "Premium users receive new AI cooking tools first." }
];

export default function PremiumScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top || 30) + 12;

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("premium_12_month");

  const isPremium = Boolean(user?.isPremium || user?.subscription?.isPremium);

  const handleSubscribe = async (plan) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId: plan.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || data.message || "Subscription processing failed");
      }

      Alert.alert("Tastewise Premium 🌟", "Your account is now activated with Premium benefits!");
    } catch (err) {
      Alert.alert("Subscription Note", err.message || "Google Play In-App Purchasing will connect when published on Play Store.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tastewise Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroBox}>
          <Text style={styles.heroBadge}>TASTEWISE PREMIUM</Text>
          <Text style={styles.heroTitle}>Cook with fewer limits.</Text>
          <Text style={styles.heroSub}>
            {isPremium
              ? "Premium is currently active for your account."
              : "Upgrade to unlock ad-free recipes, unlimited planner storage, and priority AI tools."}
          </Text>
        </View>

        {/* STATUS CARD */}
        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{isPremium ? "🌟 Premium Account" : "Free Account"}</Text>
            <Text style={styles.statusDesc}>
              {isPremium
                ? "All ads hidden and full feature limits unlocked."
                : "Free account. Upgrade below for full feature access."}
            </Text>
          </View>
          <View style={[styles.statusBadge, isPremium ? styles.badgeActive : styles.badgeFree]}>
            <Text style={[styles.statusBadgeText, isPremium ? styles.textActive : styles.textFree]}>
              {isPremium ? "ACTIVE" : "FREE"}
            </Text>
          </View>
        </View>

        {/* SUBSCRIPTION PLANS */}
        <Text style={styles.sectionHeader}>Choose Your Plan</Text>
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeaderRow}>
                <View>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planNote}>{plan.note}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{plan.badge}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.chooseBtn, isSelected && styles.chooseBtnSelected]}
                onPress={() => handleSubscribe(plan)}
                disabled={loading}
              >
                {loading && selectedPlan === plan.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[styles.chooseBtnText, isSelected && styles.chooseBtnTextSelected]}>
                    {isPremium ? "Current Plan" : `Get ${plan.label}`}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* BENEFITS SECTION */}
        <Text style={styles.sectionHeader}>Why Go Premium?</Text>
        <View style={styles.benefitsGrid}>
          {benefits.map((b, idx) => (
            <View key={idx} style={styles.benefitCard}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitCopy}>{b.copy}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center"
  },
  backBtn: {
    marginRight: 16
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.sage
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40
  },
  heroBox: {
    backgroundColor: colors.sage,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    marginBottom: 6
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20
  },
  statusCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink
  },
  statusDesc: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  badgeActive: {
    backgroundColor: "#E8F5E9"
  },
  badgeFree: {
    backgroundColor: "#FFF2EB"
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  textActive: {
    color: colors.sage
  },
  textFree: {
    color: colors.orange
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 14
  },
  planCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  planCardSelected: {
    borderColor: colors.sage,
    borderWidth: 2
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  planLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink
  },
  planNote: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  badgePill: {
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.sage
  },
  chooseBtn: {
    backgroundColor: "#F4F3EF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  chooseBtnSelected: {
    backgroundColor: colors.sage
  },
  chooseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  chooseBtnTextSelected: {
    color: "#FFF"
  },
  benefitsGrid: {
    gap: 12
  },
  benefitCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  benefitIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink
  },
  benefitCopy: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 18
  }
});
