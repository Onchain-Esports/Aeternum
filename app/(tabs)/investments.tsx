import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/mocks/data';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, PlusCircle, TrendingDown, TrendingUp, Zap } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InvestmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { investments, totalPortfolioValue, totalInvested, totalYieldEarned, totalClaimable, overallROI } = useWallet();

  const roiPositive = overallROI >= 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>My Positions</Text>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => router.push('/(tabs)/explore' as any)}
          activeOpacity={0.8}
        >
          <PlusCircle size={16} color={Colors.gold} />
          <Text style={styles.exploreBtnText}>Trade</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#1C1A08', '#241F0A']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.summaryGlow} />
          <Text style={styles.summaryLabel}>TOTAL PORTFOLIO VALUE</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalPortfolioValue)}</Text>
          <View style={styles.roiRow}>
            {roiPositive
              ? <TrendingUp size={14} color={Colors.green} />
              : <TrendingDown size={14} color={Colors.red} />
            }
            <Text style={[styles.roiText, { color: roiPositive ? Colors.green : Colors.red }]}>
              {overallROI.toFixed(2)}% overall ROI
            </Text>
          </View>
          <View style={styles.summaryGrid}>
            {[
              { label: 'Capital Deployed', value: formatCurrency(totalInvested), color: Colors.cyan },
              { label: 'Rewards Earned', value: formatCurrency(totalYieldEarned), color: Colors.green },
              { label: 'Claimable', value: formatCurrency(totalClaimable), color: Colors.gold },
              { label: 'Positions', value: `${investments.length}`, color: Colors.purple },
            ].map((s) => (
              <View key={s.label} style={styles.summaryCell}>
                <Text style={[styles.summaryCellVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.summaryCellLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {totalClaimable > 0 && (
          <TouchableOpacity
            style={styles.claimBanner}
            onPress={() => router.push('/claim' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.greenGlow, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.claimLeft}>
              <Zap size={18} color={Colors.green} />
              <View>
                <Text style={styles.claimTitle}>Claimable Rewards Ready</Text>
                <Text style={styles.claimAmount}>{formatCurrency(totalClaimable)}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.green} />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Open Positions ({investments.length})</Text>

        {investments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No positions yet</Text>
            <Text style={styles.emptyText}>Start trading tokenized esports markets to build your portfolio</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/explore' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#D4AF37', '#A88C28']} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Explore Markets</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          investments.map((inv) => {
            const pnl = inv.currentValue - inv.purchasePrice;
            const pnlPositive = pnl >= 0;
            const claimPct = inv.claimableYield > 0
              ? ((inv.claimableYield / (inv.yieldEarned || 1)) * 100).toFixed(0)
              : '0';
            return (
              <View key={inv.id} style={styles.invCard}>
                <View style={styles.invHeader}>
                  <Image source={{ uri: inv.propertyImage }} style={styles.invImage} />
                  <View style={styles.invInfo}>
                    <Text style={styles.invName} numberOfLines={2}>{inv.propertyName}</Text>
                    <Text style={styles.invLocation}>{inv.propertyLocation}</Text>
                    <Text style={styles.invDate}>
                      {inv.sharesOwned} units · Entered {inv.investedAt}
                    </Text>
                  </View>
                </View>

                <View style={styles.invStats}>
                  <View style={styles.invStat}>
                    <Text style={styles.invStatVal}>{formatCurrency(inv.currentValue)}</Text>
                    <Text style={styles.invStatLabel}>Current Value</Text>
                  </View>
                  <View style={styles.invStat}>
                    <Text style={[styles.invStatVal, { color: pnlPositive ? Colors.green : Colors.red }]}>
                      {pnlPositive ? '+' : ''}{formatCurrency(pnl)}
                    </Text>
                    <Text style={styles.invStatLabel}>P&L</Text>
                  </View>
                  <View style={styles.invStat}>
                    <Text style={[styles.invStatVal, { color: Colors.gold }]}>
                      {inv.roi.toFixed(1)}%
                    </Text>
                    <Text style={styles.invStatLabel}>ROI</Text>
                  </View>
                </View>

                <View style={styles.yieldRow}>
                  <View>
                    <Text style={styles.yieldEarned}>Rewards Earned: {formatCurrency(inv.yieldEarned)}</Text>
                    {inv.claimableYield > 0 && (
                      <Text style={styles.yieldClaimable}>
                        Claimable: {formatCurrency(inv.claimableYield)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.invActions}>
                    {inv.claimableYield > 0 && (
                      <TouchableOpacity
                        style={styles.claimBtn}
                        onPress={() => router.push('/claim' as any)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.claimBtnText}>Claim</Text>
                      </TouchableOpacity>
                    )}
                    {inv.sharesOwned > 0 && (
                      <TouchableOpacity
                        style={styles.sellBtn}
                        onPress={() => router.push(`/sell/${inv.propertyId}` as any)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.sellBtnText}>Sell</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldGlow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  exploreBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.gold },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    overflow: 'hidden',
    marginBottom: 12,
  },
  summaryGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.goldGlow,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  roiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 18,
  },
  roiText: { fontSize: 13, fontWeight: '600' as const },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
    paddingTop: 16,
  },
  summaryCell: { width: '50%', paddingBottom: 12 },
  summaryCellVal: { fontSize: 16, fontWeight: '700' as const, marginBottom: 2 },
  summaryCellLabel: { fontSize: 11, color: Colors.textMuted },
  claimBanner: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.green,
    marginBottom: 24,
    overflow: 'hidden',
  },
  claimLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimTitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  claimAmount: { fontSize: 17, fontWeight: '700' as const, color: Colors.green },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden', width: 200 },
  emptyBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.background },
  invCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  invHeader: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  invImage: { width: 70, height: 70, borderRadius: 12 },
  invInfo: { flex: 1 },
  invName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 3 },
  invLocation: { fontSize: 12, color: Colors.textMuted, marginBottom: 3 },
  invDate: { fontSize: 11, color: Colors.textDisabled },
  invStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  invStat: { flex: 1, alignItems: 'center' },
  invStatVal: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginBottom: 2 },
  invStatLabel: { fontSize: 10, color: Colors.textMuted },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yieldEarned: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  yieldClaimable: { fontSize: 12, color: Colors.green, fontWeight: '600' as const },
  invActions: { flexDirection: 'row', gap: 8 },
  claimBtn: {
    backgroundColor: `${Colors.green}22`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  claimBtnText: { fontSize: 12, fontWeight: '700' as const, color: Colors.green },
  sellBtn: {
    backgroundColor: `${Colors.red}22`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  sellBtnText: { fontSize: 12, fontWeight: '700' as const, color: Colors.red },
});
