import Colors from '@/constants/Colors';
import { formatCurrency } from '@/mocks/data';
import { ApiError } from '@/services/api';
import { fetchListingDrafts, ListingDraftListItem, mintPropertyFromDraft } from '@/services/listingDraft';
import { fetchMyListings } from '@/services/property';
import { Listing } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Building2, ChevronRight, MapPin, Plus, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: Colors.textMuted, bg: Colors.border },
  pending: { label: 'Pending Review', color: Colors.gold, bg: Colors.goldGlow },
  approved: { label: 'Approved', color: Colors.cyan, bg: Colors.cyanGlow },
  rejected: { label: 'Rejected', color: Colors.red, bg: Colors.redGlow },
  live: { label: 'Live', color: Colors.green, bg: Colors.greenGlow },
};

export default function ListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(true);
  const [myListingsError, setMyListingsError] = useState('');
  const [drafts, setDrafts] = useState<ListingDraftListItem[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [draftError, setDraftError] = useState('');
  const [mintingDraftId, setMintingDraftId] = useState<string | null>(null);

  const activeListings = useMemo(
    () => myListings.filter((listing) => listing.status !== 'draft'),
    [myListings],
  );

  const loadMyListings = useCallback(async () => {
    try {
      setIsLoadingMyListings(true);
      setMyListingsError('');
      const data = await fetchMyListings(1, 100);
      setMyListings(data);
    } catch (error) {
      setMyListingsError(error instanceof Error ? error.message : 'Unable to fetch my listings');
      setMyListings([]);
    } finally {
      setIsLoadingMyListings(false);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoadingDrafts(true);
      setDraftError('');
      const data = await fetchListingDrafts();
      setDrafts(data);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Unable to fetch drafts');
    } finally {
      setIsLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    loadMyListings();
  }, [loadDrafts, loadMyListings]);

  const handleMintProperty = async (draftId: string) => {
    if (mintingDraftId) return;

    try {
      setMintingDraftId(draftId);
      console.log('[Listings] mint request:', { draftId });
      const response = await mintPropertyFromDraft(draftId);
      console.log('[Listings] mint response:', response);
      await loadDrafts();
      await loadMyListings();
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('[Listings] mint error status:', error.status);
        console.log('[Listings] mint error response:', error.data);
      } else {
        console.log('[Listings] mint error:', error);
      }
    } finally {
      setMintingDraftId(null);
    }
  };

  const totalRaised = activeListings.reduce((s, l) => s + l.amountRaised, 0);
  const totalTarget = activeListings.reduce((s, l) => s + l.totalTarget, 0);
  const liveCount = activeListings.filter((l) => l.status === 'live').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Markets</Text>
          <Text style={styles.subtitle}>{activeListings.length} active markets created</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/list/step1' as any)}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#D4AF37', '#A88C28']} style={styles.addBtnGrad}>
            <Plus size={18} color={Colors.background} />
            <Text style={styles.addBtnText}>Create New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.statsRow}>
          {[
            { label: 'Total Raised', value: formatCurrency(totalRaised, true), color: Colors.green },
            { label: 'Liquidity Target', value: formatCurrency(totalTarget, true), color: Colors.cyan },
            { label: 'Live', value: `${liveCount}`, color: Colors.gold },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Draft Markets</Text>
        {isLoadingDrafts ? (
          <View style={styles.draftLoader}>
            <ActivityIndicator color={Colors.gold} />
            <Text style={styles.draftLoaderText}>Loading drafts...</Text>
          </View>
        ) : draftError ? (
          <View style={styles.draftErrorBox}>
            <Text style={styles.draftErrorText}>{draftError}</Text>
          </View>
        ) : drafts.length === 0 ? (
          <View style={styles.draftEmptyBox}>
            <Text style={styles.draftEmptyText}>No drafts found</Text>
          </View>
        ) : (
          drafts.map((draft) => (
            <TouchableOpacity
              key={draft.id}
              style={styles.draftCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/list/draft/${draft.id}` as any)}
            >
              <View style={styles.draftHeader}>
                <Text style={styles.draftName}>{draft.step1Data?.name || 'Untitled draft'}</Text>
                <View style={styles.draftStatusBadge}>
                  <Text style={styles.draftStatusText}>{draft.workflowStatus}</Text>
                </View>
              </View>

              <Text style={styles.draftMeta}>
                {[draft.step1Data?.city, draft.step1Data?.country].filter(Boolean).join(', ') || 'Location missing'}
              </Text>

              <View style={styles.draftProgressRow}>
                {/* <Text style={styles.draftProgressText}>Step {draft.stepCompleted} / 4     </Text> */}
                <Text style={styles.draftProgressText}>
                  {draft.submittedAt ? 'Submitted  ' : 'Not submitted  '}
                </Text>
                <ChevronRight size={14} color={Colors.textMuted} />
              </View>

              {draft.workflowStatus === 'submitted' && (
                <TouchableOpacity
                  style={styles.mintBtn}
                  activeOpacity={0.85}
                  onPress={() => handleMintProperty(draft.id)}
                  disabled={mintingDraftId === draft.id}
                >
                  {mintingDraftId === draft.id ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.mintBtnText}>Mint Market</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/list/step1' as any)}
              >
                <Edit3 size={14} color={Colors.cyan} />
                <Text style={styles.editBtnText}>Continue Draft</Text>
              </TouchableOpacity> */}
            </TouchableOpacity>
          ))
        )}

        {isLoadingMyListings ? (
          <View style={styles.draftLoader}>
            <ActivityIndicator color={Colors.gold} />
            <Text style={styles.draftLoaderText}>Loading your created markets...</Text>
          </View>
        ) : myListingsError ? (
          <View style={styles.draftErrorBox}>
            <Text style={styles.draftErrorText}>{myListingsError}</Text>
          </View>
        ) : activeListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎮</Text>
            <Text style={styles.emptyTitle}>No markets yet</Text>
            <Text style={styles.emptyText}>
              Create esports markets and let traders take positions with transparent pricing
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/list/step1' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#D4AF37', '#A88C28']} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Create a Market</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Approved / Live Markets</Text>
            {activeListings.map((listing) => {
              const cfg = STATUS_CONFIG[listing.status];
              const pct = listing.totalTarget > 0
                ? (listing.amountRaised / listing.totalTarget * 100).toFixed(0)
                : '0';
              return (
                <View key={listing.id} style={styles.listingCard}>
                  <View style={styles.listingHeader}>
                    {listing.image ? (
                      <Image source={{ uri: listing.image }} style={styles.listingImage} />
                    ) : (
                      <View style={styles.listingImagePlaceholder}>
                        <Building2 size={24} color={Colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingName} numberOfLines={2}>{listing.propertyName}</Text>
                      {(listing.city || listing.country) && (
                        <View style={styles.locationRow}>
                          <MapPin size={11} color={Colors.textMuted} />
                          <Text style={styles.locationText}>
                            {[listing.city, listing.country].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>

                  {listing.status === 'live' && (
                    <>
                      <View style={styles.raisedRow}>
                        <Text style={styles.raisedText}>
                          {formatCurrency(listing.amountRaised)} filled of {formatCurrency(listing.totalTarget)}
                        </Text>
                        <Text style={styles.raisedPct}>{pct}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={[Colors.green, Colors.goldDark]}
                          style={[styles.progressFill, { width: `${pct}%` as any }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                      <View style={styles.investorsRow}>
                        <Users size={12} color={Colors.textMuted} />
                        <Text style={styles.investorsText}>{listing.investors} traders</Text>
                        {listing.yieldPercent && (
                          <Text style={styles.yieldText}>{listing.yieldPercent}% reward APR</Text>
                        )}
                      </View>
                    </>
                  )}

                  <View style={styles.listingActions}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/property/${listing.id}` as any)}
                    >
                      <Text style={styles.viewBtnText}>View Details</Text>
                      <ChevronRight size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How market creation works</Text>
          <View style={styles.infoSteps}>
            {[
              { step: '1', text: 'Submit market details and proof assets' },
              { step: '2', text: 'Our team reviews and verifies (1-3 days)' },
              { step: '3', text: 'Market goes live on the exchange' },
              { step: '4', text: 'Receive USDC as traders fill positions' },
            ].map((s) => (
              <View key={s.step} style={styles.infoStep}>
                <View style={styles.infoStepNum}>
                  <Text style={styles.infoStepNumText}>{s.step}</Text>
                </View>
                <Text style={styles.infoStepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </View>
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
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: Colors.textMuted },
  addBtn: { borderRadius: 12, overflow: 'hidden', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8 },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.background },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statVal: { fontSize: 17, fontWeight: '700' as const, marginBottom: 3 },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  listingCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  listingHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  listingImage: { width: 64, height: 64, borderRadius: 12 },
  listingImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 12, color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  raisedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  raisedText: { fontSize: 12, color: Colors.textSecondary },
  raisedPct: { fontSize: 12, color: Colors.green, fontWeight: '600' as const },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 2 },
  investorsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  investorsText: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  yieldText: { fontSize: 12, color: Colors.gold, fontWeight: '600' as const },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cyanGlow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  editBtnText: { fontSize: 12, fontWeight: '600' as const, color: Colors.cyan },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewBtnText: { fontSize: 12, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden' },
  emptyBtnGrad: { paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center' },
  emptyBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.background },
  infoBox: {
    margin: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  infoSteps: { gap: 12 },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.goldDark,
    flexShrink: 0,
  },
  infoStepNumText: { fontSize: 12, fontWeight: '700' as const, color: Colors.gold },
  infoStepText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, flex: 1 },
  draftLoader: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  draftLoaderText: { color: Colors.textMuted, fontSize: 12 },
  draftErrorBox: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.red,
    backgroundColor: Colors.redGlow,
    padding: 12,
    marginBottom: 16,
  },
  draftErrorText: { color: Colors.red, fontSize: 12 },
  draftEmptyBox: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 12,
    marginBottom: 16,
  },
  draftEmptyText: { color: Colors.textMuted, fontSize: 12 },
  draftCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 14,
  },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  draftName: { color: Colors.text, fontSize: 14, fontWeight: '700' as const, flex: 1, marginRight: 8 },
  draftStatusBadge: { backgroundColor: Colors.goldGlow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.goldDark },
  draftStatusText: { color: Colors.gold, fontSize: 11, fontWeight: '600' as const },
  draftMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 6 },
  draftProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  draftProgressText: { color: Colors.textSecondary, fontSize: 12 },
  mintBtn: {
    marginTop: 2,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mintBtnText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
