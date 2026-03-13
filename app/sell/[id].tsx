import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/mocks/data';
import { runMobileWalletTransaction } from '@/services/mobileWallet';
import {
  confirmSellAsset,
  prepareSellAsset,
  type SellPreview,
} from '@/services/transactions';
import { useWalletStore } from '@/stores/wallet-store';
import { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { clusterApiUrl, Connection, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, Shield } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_IDENTITY = {
  name: 'Aeternum',
  uri: 'https://aeturnum.app',
  icon: 'favicon.ico',
};

async function sendAndConfirmWithFallback(
  serializedTx: Uint8Array,
  isDevnet: boolean,
): Promise<{ signature: string; endpoint: string }> {
  const devnetFallbacks = (process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const mainnetFallbacks = (process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const endpoints = isDevnet
    ? [
      process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC_URL?.trim(),
      ...devnetFallbacks,
      clusterApiUrl('devnet'),
      'https://api.devnet.solana.com',
    ]
    : [
      process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC_URL?.trim(),
      ...mainnetFallbacks,
      clusterApiUrl('mainnet-beta'),
      'https://api.mainnet-beta.solana.com',
    ];

  const uniqueEndpoints = Array.from(new Set(endpoints.filter((endpoint): endpoint is string => !!endpoint)));
  const failures: string[] = [];

  for (const endpoint of uniqueEndpoints) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const signature = await connection.sendRawTransaction(serializedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, endpoint };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${endpoint}: ${message}`);
      console.error('[Sell] RPC endpoint failed', { endpoint, error: message });
    }
  }

  throw new Error(`All RPC endpoints failed. ${failures.join(' | ')}`);
}



export default function SellSharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { publicKeyBase58, isConnected, investments } = useWallet();
  const isDevnet = useWalletStore((s) => s.isDevnet);

  const [quantity, setQuantity] = useState('1');
  const [preview, setPreview] = useState<SellPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState('');

  const investment = investments.find((inv) => inv.propertyId === id);
  const maxQuantityOwned = investment?.sharesOwned ?? 0;

  const quantityNum = Math.max(0, parseInt(quantity) || 0);

  useEffect(() => {
    let mounted = true;

    const loadPreview = async () => {
      if (!id || !publicKeyBase58 || quantityNum <= 0) {
        setPreview(null);
        setPreviewError('');
        return;
      }

      try {
        setIsLoadingPreview(true);
        setPreviewError('');
        const data = await prepareSellAsset({ assetId: id, quantity: quantityNum });
        if (mounted) {
          setPreview(data.preview);
        }
      } catch (error) {
        if (mounted) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to fetch sell preview');
          setPreview(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingPreview(false);
        }
      }
    };

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [id, publicKeyBase58, quantityNum]);

  const grossPayout = preview?.grossPayout ?? 0;
  const fee = preview?.feeBreakdown.feeAmount ?? 0;
  const feePct = ((preview?.feeBreakdown.feeBps ?? 0) / 100).toFixed(2);
  const netPayout = preview?.netPayout ?? 0;
  const currentPrice = preview?.currentPrice ?? 0;

  const canSell = useMemo(() => {
    if (!publicKeyBase58 || !isConnected) return false;
    if (!isDevnet) return false;
    if (quantityNum <= 0) return false;
    if (isLoadingPreview || !!previewError) return false;
    if (!preview) return false;
    return true;
  }, [publicKeyBase58, isConnected, isDevnet, quantityNum, isLoadingPreview, previewError, preview]);

  const adjust = (delta: number) => {
    const n = Math.max(1, (parseInt(quantity) || 0) + delta);
    setQuantity(String(n));
  };

  const handleConfirm = async () => {
    if (!canSell || !id || !publicKeyBase58) return;

    let stage = 'init';

    try {
      setIsConfirming(true);
      setTransactionError('');

      console.log('[Sell] initiate request', {
        stage = 'wallet-sign-and-send';
        stage = 'prepare-sell';
        const prepared = await prepareSellAsset({ assetId: id, quantity: quantityNum });
        const signature = await runMobileWalletTransaction(async (wallet: Web3MobileWallet) => {
          const walletState = useWalletStore.getState();
          const chain = walletState.isDevnet ? 'solana:devnet' : 'solana:mainnet-beta';

          const authResult = await wallet.authorize({
            chain,
            identity: APP_IDENTITY,
            auth_token: walletState.authToken ?? undefined,
          });

          if (walletState.walletType && walletState.publicKeyBase58) {
            walletState.setWalletData({
              walletType: walletState.walletType,
              publicKeyBase58: walletState.publicKeyBase58,
              authToken: authResult.auth_token ?? walletState.authToken ?? '',
            });
          }

          const unsignedTxBytes = Buffer.from(initiated.unsignedTx, 'base64');
          const unsignedTx = VersionedTransaction.deserialize(unsignedTxBytes);
          const unsignedTxBytes = Buffer.from(prepared.unsignedTx, 'base64');
          // Prefer wallet-native submit path to avoid device RPC reachability issues.
          const maybeSignAndSend = (
            wallet as unknown as {
              signAndSendTransactions?: (args: { transactions: VersionedTransaction[] }) => Promise<{ signatures: Array<string | Uint8Array> }>;
            }
          ).signAndSendTransactions;

          if (typeof maybeSignAndSend === 'function') {
            const walletSendResult = await maybeSignAndSend({ transactions: [unsignedTx] });
            const walletSig = Array.isArray(walletSendResult)
              ? walletSendResult[0]
              : walletSendResult?.signatures?.[0];

            if (typeof walletSig === 'string' && walletSig.length > 0) {
              console.log('[Sell] tx sent via wallet-native submit', { txSignature: walletSig });
              return walletSig;
            }

            if (walletSig instanceof Uint8Array && walletSig.length > 0) {
              const derivedSig = bs58.encode(walletSig);
              console.log('[Sell] tx sent via wallet-native submit (Uint8Array signature)', { txSignature: derivedSig });
              return derivedSig;
            }

            // Some wallets submit successfully but don't return signatures in the adapter response.
            const txSignatureBytes = unsignedTx.signatures?.[0];
            if (txSignatureBytes instanceof Uint8Array && txSignatureBytes.some((b) => b !== 0)) {
              const derivedSig = bs58.encode(txSignatureBytes);
              console.log('[Sell] tx sent via wallet-native submit (derived from tx signature bytes)', { txSignature: derivedSig });
              return derivedSig;
            }

            console.log('[Sell] wallet-native submit result missing signature; not falling back to app RPC to avoid duplicate send', {
              signatureType: typeof walletSig,
              rawResult: walletSendResult,
            });

            throw new Error(
              'Wallet submitted transaction but did not return a signature. Check wallet history for the tx signature and confirm manually.',
            );
          }

          const signedTxs = await wallet.signTransactions({ transactions: [unsignedTx] });

          if (!signedTxs?.[0]) {
            throw new Error('Wallet returned no signed transaction');
          }

          const result = await sendAndConfirmWithFallback(
            signedTxs[0].serialize(),
            walletState.isDevnet,
          );

          console.log('[Sell] tx sent+confirmed via app RPC', { txSignature: result.signature, endpoint: result.endpoint });
          return result.signature;
        });

        stage = 'confirm-sell';
        const confirmPayload = {
          txSignature: signature,
          const confirmPayload = { txSignature: signature, assetId: id, quantity: quantityNum };
          console.log('[Sell] confirm request', confirmPayload);
          await confirmSellAsset(confirmPayload);
          console.log('[Sell] confirm success', { txSignature: signature });
          setTimeout(() => router.replace('/(tabs)/investments' as any), 2000);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Position close failed';
  const rpcBlocked = stage === 'wallet-sign-and-send' && message.includes('All RPC endpoints failed');
  const confirmNetworkBlocked =
    stage === 'confirm-sell'
        : confirmNetworkBlocked
    ? `${message}\n\nBackend confirm could not be reached from device network. Keep internet stable (disable VPN/Private DNS) and retry after a few seconds. Do not submit a new sell immediately with different shares.`
    : message;
  stage,
    propertyId: id,
      shares: sharesNum,
        assetId: id,
          quantity: quantityNum,
            stack: error instanceof Error ? error.stack : undefined,
      });
const stagedMessage = `[${stage}] ${finalMessage}`;
setTransactionError(stagedMessage);
Alert.alert('Transaction failed', stagedMessage);
    } finally {
  setIsConfirming(false);
}
  };

if (!investment) {
  return (
    <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
      <Text style={styles.notFound}>No owned units found for this market</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

if (isSuccess) {
  return (
    <View style={[styles.successScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />
      <View style={styles.successIcon}>
        <LinearGradient colors={['#00D68F', '#008F5F']} style={styles.successIconGrad}>
          <Check size={36} color={Colors.background} strokeWidth={3} />
        </LinearGradient>
      </View>
      <Text style={styles.successTitle}>Position Reduced!</Text>
      <Text style={styles.successSub}>
        {quantityNum} units of {preview?.assetName ?? id} sold{'\n'}for {formatCurrency(netPayout)} USDC
      </Text>
      <Text style={styles.successRedirect}>Redirecting to portfolio...</Text>
    </View>
  );
}

return (
  <View style={[styles.container, { paddingTop: insets.top }]}>
    <LinearGradient colors={['#0D0E1A', '#08090D']} style={StyleSheet.absoluteFill} />

    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={20} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Close Position</Text>
      <View style={{ width: 40 }} />
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <View style={styles.propInfo}>
        <Text style={styles.propName}>{property.name}</Text>
        <Text style={styles.propLocation}>{property.location}</Text>
        <Text style={styles.ownedText}>You hold {maxSharesOwned} units</Text>
      </View>

      <View style={styles.sharesSection}>
        <Text style={styles.sharesLabel}>Units to Sell</Text>
        <View style={styles.sharesControl}>
          <TouchableOpacity
            style={[styles.adjBtn, sharesNum <= 1 && styles.adjBtnDisabled]}
            onPress={() => adjust(-1)}
            disabled={sharesNum <= 1}
          >
            <Minus size={18} color={sharesNum <= 1 ? Colors.textDisabled : Colors.text} />
          </TouchableOpacity>
          <TextInput
            style={styles.sharesInput}
            value={shares}
            onChangeText={(v) => setShares(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            textAlign="center"
          />
          <TouchableOpacity
            style={[styles.adjBtn, sharesNum >= maxSharesOwned && styles.adjBtnDisabled]}
            onPress={() => adjust(1)}
            disabled={sharesNum >= maxSharesOwned}
          >
            <Plus size={18} color={sharesNum >= maxSharesOwned ? Colors.textDisabled : Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.sharesSliderInfo}>
          <Text style={styles.sharesRemaining}>
            Remaining after sale: {maxSharesOwned - sharesNum} units
          </Text>
        </View>
      </View>

      <View style={styles.calcCard}>
        <Text style={styles.calcTitle}>Sale Summary</Text>
        {[
          { label: 'Units to Sell', value: sharesNum.toLocaleString() },
          { label: 'Current Price/Unit', value: formatCurrency(property.pricePerShare) },
          { label: 'Gross Proceeds', value: formatCurrency(proceeds) },
          { label: 'Sell Fee', value: `-${formatCurrency(fee)}` },
        ].map((row) => (
          <View key={row.label} style={styles.calcRow}>
            <Text style={styles.calcLabel}>{row.label}</Text>
            <Text style={styles.calcVal}>{row.value}</Text>
          </View>
        ))}
        <View style={styles.calcDivider} />
        <View style={styles.calcRow}>
          <Text style={styles.calcTotalLabel}>Net Proceeds (USDC)</Text>
          <Text style={styles.calcTotalVal}>{formatCurrency(netProceeds)}</Text>
        </View>
      </View>

      <View style={styles.pnlCard}>
        <View style={styles.pnlHeader}>
          <TrendingDown size={16} color={pnlPositive ? Colors.green : Colors.red} />
          <Text style={styles.pnlTitle}>Profit & Loss</Text>
        </View>
        <View style={styles.pnlGrid}>
          <View style={styles.pnlCell}>
            <Text style={styles.pnlCellVal}>{formatCurrency(proceeds)}</Text>
            <Text style={styles.pnlCellLabel}>Gross</Text>
          </View>
          <View style={styles.pnlCell}>
            <Text style={styles.pnlCellVal}>{formatCurrency(netProceeds)}</Text>
            <Text style={styles.pnlCellLabel}>Net</Text>
          </View>
          <View style={styles.pnlCell}>
            <Text style={[styles.pnlCellVal, { color: pnlPositive ? Colors.green : Colors.red }]}>
              {pnlPositive ? '+' : ''}{formatCurrency(pnl)}
            </Text>
            <Text style={styles.pnlCellLabel}>P&L</Text>
          </View>
        </View>
      </View>

      {(quoteError || transactionError || !isConnected || !isDevnet) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {quoteError || transactionError || (!isConnected
              ? 'Connect wallet first to close positions.'
              : 'Switch to devnet mode to execute this flow.')}
          </Text>
        </View>
      )}

      {isLoadingQuote && (
        <View style={styles.loadingInline}>
          <ActivityIndicator color={Colors.gold} size="small" />
          <Text style={styles.loadingInlineText}>Refreshing sell quote...</Text>
        </View>
      )}

      <View style={styles.securityRow}>
        <Shield size={14} color={Colors.green} />
        <Text style={styles.securityText}>
          Transaction signed locally · Non-custodial · USDC settles to wallet
        </Text>
      </View>
    </ScrollView>

    <View style={[styles.sellBar, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient colors={['transparent', 'rgba(8,9,13,0.98)']} style={StyleSheet.absoluteFill} />
      <TouchableOpacity
        style={[styles.confirmBtn, !canSell && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!canSell || isConfirming}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={canSell ? [Colors.red, '#CC1A35'] : [Colors.border, Colors.border]}
          style={styles.confirmBtnGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isConfirming ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            borderWidth: 1, borderColor: Colors.border, marginBottom: 14, alignItems: 'center',
  },
          sharesLabel: {fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
          sharesControl: {flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
          adjBtn: {
            width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.surface,
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight,
  },
          adjBtnDisabled: {opacity: 0.4 },
          sharesInput: {
            width: 100, height: 56, backgroundColor: Colors.surface, borderRadius: 14,
          fontSize: 28, fontWeight: '800' as const, color: Colors.text,
          borderWidth: 1, borderColor: Colors.red, textAlign: 'center',
  },
          sharesSliderInfo: {alignItems: 'center' },
          sharesRemaining: {fontSize: 12, color: Colors.textMuted },
          calcCard: {
            backgroundColor: Colors.card, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
          calcTitle: {fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
          calcRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
          calcLabel: {fontSize: 13, color: Colors.textMuted },
          calcVal: {fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
          calcDivider: {height: 1, backgroundColor: Colors.border, marginVertical: 10 },
          calcTotalLabel: {fontSize: 15, fontWeight: '700' as const, color: Colors.text },
          calcTotalVal: {fontSize: 17, fontWeight: '800' as const, color: Colors.green },
          pnlCard: {
            backgroundColor: Colors.card, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
          pnlHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
          pnlTitle: {fontSize: 15, fontWeight: '700' as const, color: Colors.text },
          pnlGrid: {flexDirection: 'row', justifyContent: 'space-around' },
          pnlCell: {alignItems: 'center' },
          pnlCellVal: {fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
          pnlCellLabel: {fontSize: 11, color: Colors.textMuted },
          securityRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
          securityText: {fontSize: 12, color: Colors.textMuted, flex: 1 },
          sellBar: {position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20 },
          confirmBtn: {borderRadius: 16, overflow: 'hidden' },
          confirmBtnDisabled: {opacity: 0.7 },
          confirmBtnGrad: {paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
          confirmBtnText: {fontSize: 17, fontWeight: '700' as const, color: Colors.white },
          confirmBtnTextDisabled: {color: Colors.textMuted },
          errorBanner: {
            backgroundColor: Colors.redGlow,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: Colors.red,
          marginBottom: 14,
  },
          errorText: {fontSize: 13, color: Colors.red, textAlign: 'center' },
          loadingInline: {
            flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 14,
  },
          loadingInlineText: {fontSize: 12, color: Colors.textMuted },
});
