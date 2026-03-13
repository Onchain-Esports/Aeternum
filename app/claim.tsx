import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/mocks/data';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Check, Shield, Wallet, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { investments, totalClaimable, claimYield, isClaiming } = useWallet();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleClaim = async () => {
    try {
      await claimYield(totalClaimable);
      router.back();
    } catch (e) {
      console.log('[Claim] Error:', e);
    }
  };

  const gasEstimate = 0.000012;
  const claimableItems = investments.filter(inv => inv.claimableYield > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0A0F0A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.heroSection}>
          <Animated.View style={[styles.glowBg, { opacity: glowAnim }]} />
          <Animated.View style={[styles.claimBadge, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[Colors.green, '#008F5F']}
              style={styles.claimBadgeGrad}
            >
              <Zap size={40} color={Colors.background} />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.claimLabel}>CLAIMABLE REWARDS</Text>
          <Text style={styles.claimAmount}>{formatCurrency(totalClaimable)}</Text>
          <Text style={styles.claimSubtitle}>
            From {claimableItems.length} market position{claimableItems.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Calendar size={18} color={Colors.cyan} />
            <Text style={styles.infoLabel}>Last Distribution</Text>
            <Text style={styles.infoVal}>July 1, 2025</Text>
          </View>
          <View style={styles.infoCard}>
            <Wallet size={18} color={Colors.gold} />
            <Text style={styles.infoLabel}>Gas Fee</Text>
            <Text style={styles.infoVal}>~{gasEstimate} SOL</Text>
          </View>
        </View>

        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Breakdown by Market</Text>
          {claimableItems.map((inv) => (
            <View key={inv.id} style={styles.invRow}>
              <View style={styles.invDot} />
              <View style={styles.invInfo}>
                <Text style={styles.invName} numberOfLines={1}>{inv.propertyName}</Text>
                <Text style={styles.invShares}>{inv.sharesOwned} units</Text>
              </View>
              <Text style={styles.invYield}>{formatCurrency(inv.claimableYield)}</Text>
            </View>
          ))}
          {claimableItems.length === 0 && (
            <View style={styles.emptyYield}>
              <Text style={styles.emptyYieldText}>No claimable rewards right now</Text>
              <Text style={styles.emptyYieldSub}>Rewards are distributed periodically</Text>
            </View>
          )}
        </View>

        <View style={styles.processSection}>
          <Text style={styles.sectionTitle}>Claim Process</Text>
          {[
            { step: '1', text: 'Sign transaction with your wallet', icon: '✍️' },
            { step: '2', text: 'Smart contract verifies your positions', icon: '🔐' },
            { step: '3', text: 'USDC is sent to your wallet', icon: '💸' },
          ].map((s) => (
            <View key={s.step} style={styles.processStep}>
              <Text style={styles.processStepIcon}>{s.icon}</Text>
              <View style={styles.processStepInfo}>
                <Text style={styles.processStepText}>{s.text}</Text>
              </View>
              <View style={styles.processCheck}>
                <Check size={12} color={Colors.green} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.securityRow}>
          <Shield size={14} color={Colors.green} />
          <Text style={styles.securityText}>
            Non-custodial claim · Your rewards, your control · Instant USDC settlement
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.claimBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient colors={['transparent', 'rgba(8,9,13,0.98)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.claimBtn, (totalClaimable <= 0 || isClaiming) && styles.claimBtnDisabled]}
          onPress={handleClaim}
          disabled={totalClaimable <= 0 || isClaiming}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={totalClaimable > 0 ? [Colors.green, '#008F5F'] : [Colors.border, Colors.border]}
            style={styles.claimBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isClaiming ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <Zap size={18} color={totalClaimable > 0 ? Colors.background : Colors.textMuted} />
                <Text style={[styles.claimBtnText, totalClaimable <= 0 && styles.claimBtnTextDisabled]}>
                  {totalClaimable > 0 ? `Claim ${formatCurrency(totalClaimable)}` : 'Nothing to Claim'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  heroSection: { alignItems: 'center', paddingVertical: 40, position: 'relative' },
  glowBg: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.greenGlow,
  },
  claimBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  claimBadgeGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  claimLabel: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.green,
    letterSpacing: 2, marginBottom: 8,
  },
  claimAmount: { fontSize: 44, fontWeight: '800' as const, color: Colors.text, marginBottom: 6, letterSpacing: -1 },
  claimSubtitle: { fontSize: 14, color: Colors.textMuted },
  infoCards: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  infoCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 8,
  },
  infoLabel: { fontSize: 11, color: Colors.textMuted },
  infoVal: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  breakdownSection: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  invDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  invInfo: { flex: 1 },
  invName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
  invShares: { fontSize: 12, color: Colors.textMuted },
  invYield: { fontSize: 16, fontWeight: '700' as const, color: Colors.green },
  emptyYield: { alignItems: 'center', paddingVertical: 24 },
  emptyYieldText: { fontSize: 15, color: Colors.textSecondary, marginBottom: 6 },
  emptyYieldSub: { fontSize: 13, color: Colors.textMuted },
  processSection: { paddingHorizontal: 20, marginBottom: 20 },
  processStep: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  processStepIcon: { fontSize: 22 },
  processStepInfo: { flex: 1 },
  processStepText: { fontSize: 14, color: Colors.textSecondary },
  processCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.greenGlow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.green,
  },
  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 20,
  },
  securityText: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  claimBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
  claimBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
  claimBtnDisabled: { shadowOpacity: 0 },
  claimBtnGrad: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  claimBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.background },
  claimBtnTextDisabled: { color: Colors.textMuted },
});
