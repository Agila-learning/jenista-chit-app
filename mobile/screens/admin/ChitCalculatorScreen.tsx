import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/format';

type SchemeType = 'AUCTION' | 'FIXED' | 'REGULAR';
type ViewMode = 'SCHEDULE' | 'COMPARISON';

export const ChitCalculatorScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [scheme, setScheme] = useState<SchemeType>('AUCTION');
  const [viewMode, setViewMode] = useState<ViewMode>('SCHEDULE');
  const [chitValue, setChitValue] = useState<number>(100000);
  const [duration, setDuration] = useState<number>(20);
  const [foremanCommPercent, setForemanCommPercent] = useState<number>(5);
  const [avgDiscountPercent, setAvgDiscountPercent] = useState<number>(25);

  const presets = [
    { label: '₹50K', value: 50000, duration: 20 },
    { label: '₹1 Lakh', value: 100000, duration: 20 },
    { label: '₹2.5 Lakh', value: 250000, duration: 25 },
    { label: '₹5 Lakh', value: 500000, duration: 25 },
    { label: '₹10 Lakh', value: 1000000, duration: 40 },
    { label: '₹25 Lakh', value: 2500000, duration: 50 },
  ];

  const calculations = useMemo(() => {
    const grossMonthlyInstallment = Math.round(chitValue / duration);
    const foremanCommissionTotal = Math.round(chitValue * (foremanCommPercent / 100));
    const foremanCommissionPerMonth = Math.round(foremanCommissionTotal / duration);

    if (scheme === 'FIXED' || scheme === 'REGULAR') {
      const winnerNetPayout = chitValue - foremanCommissionTotal;
      const totalPaidByMember = grossMonthlyInstallment * duration;
      return {
        grossMonthlyInstallment,
        netMonthlyInstallment: grossMonthlyInstallment,
        totalPaidByMember,
        winnerNetPayout,
        foremanCommissionTotal,
        foremanCommissionPerMonth,
        totalDividendPerMember: 0,
        dividendPerMonth: 0,
        netGainOrCost: winnerNetPayout - totalPaidByMember,
        effectiveAnnualYield: '0.0',
      };
    }

    // AUCTION SCHEME
    const grossBidDiscount = Math.round(chitValue * (avgDiscountPercent / 100));
    const winnerNetPayout = chitValue - grossBidDiscount;
    const totalDividendPool = Math.max(0, grossBidDiscount - foremanCommissionTotal);
    const dividendPerMemberPerMonth = Math.round(totalDividendPool / duration);
    const netMonthlyInstallment = Math.max(0, grossMonthlyInstallment - dividendPerMemberPerMonth);
    const totalPaidByPatientSaver = Math.round(netMonthlyInstallment * (duration - 1) + grossMonthlyInstallment);
    const totalDividendEarned = Math.round(dividendPerMemberPerMonth * (duration - 1));
    const netGainForLastMonthWinner = (chitValue - foremanCommissionTotal) - totalPaidByPatientSaver;

    return {
      grossMonthlyInstallment,
      netMonthlyInstallment,
      totalPaidByMember: totalPaidByPatientSaver,
      winnerNetPayout,
      foremanCommissionTotal,
      foremanCommissionPerMonth,
      totalDividendPerMember: totalDividendEarned,
      dividendPerMonth: dividendPerMemberPerMonth,
      netGainOrCost: netGainForLastMonthWinner,
      effectiveAnnualYield: ((totalDividendEarned / chitValue) * (12 / duration) * 100).toFixed(1),
    };
  }, [scheme, chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  // Comparative Matrix Data for 3-way view
  const comparativeData = useMemo(() => {
    const gross = Math.round(chitValue / duration);
    const foremanFee = Math.round(chitValue * (foremanCommPercent / 100));

    // Auction
    const grossBid = Math.round(chitValue * (avgDiscountPercent / 100));
    const divPool = Math.max(0, grossBid - foremanFee);
    const divPerMo = Math.round(divPool / duration);
    const auctionNetMo = Math.max(0, gross - divPerMo);
    const auctionTotalPaid = Math.round(auctionNetMo * (duration - 1) + gross);
    const auctionTotalDiv = Math.round(divPerMo * (duration - 1));
    const auctionBorrowPayout = chitValue - grossBid;
    const auctionSaverPayout = chitValue - foremanFee;

    // Fixed & Regular
    const fixedTotalPaid = gross * duration;
    const fixedPayout = chitValue - foremanFee;

    return {
      auction: {
        grossInstallment: gross,
        netInstallment: auctionNetMo,
        avgDividend: divPerMo,
        totalPaid: auctionTotalPaid,
        totalDividend: auctionTotalDiv,
        borrowerPayout: auctionBorrowPayout,
        saverPayout: auctionSaverPayout,
      },
      fixed: {
        grossInstallment: gross,
        totalPaid: fixedTotalPaid,
        winnerPayout: fixedPayout,
      },
      regular: {
        grossInstallment: gross,
        totalPaid: fixedTotalPaid,
        winnerPayout: fixedPayout,
      },
    };
  }, [chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  const projectionSchedule = useMemo(() => {
    const rows = [];
    const baseInstallment = Math.round(chitValue / duration);
    const foremanFee = Math.round(chitValue * (foremanCommPercent / 100));

    let cumulativePaid = 0;

    for (let month = 1; month <= duration; month++) {
      let bidPercent = avgDiscountPercent;
      let dividend = 0;
      let netPayable = baseInstallment;
      let payout = chitValue - foremanFee;

      if (scheme === 'AUCTION') {
        const curveFactor = 1 + (0.35 * ((duration - month) / duration) - 0.15);
        bidPercent = Math.min(35, Math.max(8, Math.round(avgDiscountPercent * curveFactor)));
        const grossDiscount = Math.round(chitValue * (bidPercent / 100));
        payout = chitValue - grossDiscount;
        const divPool = Math.max(0, grossDiscount - foremanFee);
        dividend = Math.round(divPool / duration);
        netPayable = baseInstallment - dividend;
      } else {
        bidPercent = 0;
        dividend = 0;
        netPayable = baseInstallment;
        payout = chitValue - foremanFee;
      }

      cumulativePaid += netPayable;

      rows.push({
        month,
        baseInstallment,
        bidPercent,
        dividend,
        netPayable,
        winnerPayout: payout,
        cumulativePaid,
      });
    }

    return rows;
  }, [scheme, chitValue, duration, foremanCommPercent, avgDiscountPercent]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      {/* Scheme Selection Tabs */}
      <View style={styles.schemeTabsRow}>
        <TouchableOpacity
          style={[styles.schemeTab, scheme === 'AUCTION' && styles.schemeTabActive]}
          onPress={() => setScheme('AUCTION')}
        >
          <Ionicons
            name="hammer"
            size={14}
            color={scheme === 'AUCTION' ? Colors.white : Colors.textSecondary}
          />
          <Text style={[styles.schemeTabText, scheme === 'AUCTION' && styles.schemeTabTextActive]}>
            Auction
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.schemeTab, scheme === 'FIXED' && styles.schemeTabActive]}
          onPress={() => setScheme('FIXED')}
        >
          <Ionicons
            name="lock-closed"
            size={14}
            color={scheme === 'FIXED' ? Colors.white : Colors.textSecondary}
          />
          <Text style={[styles.schemeTabText, scheme === 'FIXED' && styles.schemeTabTextActive]}>
            Fixed Draw
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.schemeTab, scheme === 'REGULAR' && styles.schemeTabActive]}
          onPress={() => setScheme('REGULAR')}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={scheme === 'REGULAR' ? Colors.white : Colors.textSecondary}
          />
          <Text style={[styles.schemeTabText, scheme === 'REGULAR' && styles.schemeTabTextActive]}>
            Regular (20M)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Denomination Presets */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CHIT FACE VALUE</Text>
        <View style={styles.presetsGrid}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.presetBtn,
                chitValue === p.value && duration === p.duration && styles.presetBtnActive,
              ]}
              onPress={() => {
                setChitValue(p.value);
                setDuration(p.duration);
              }}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  chitValue === p.value && duration === p.duration && styles.presetBtnTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stepper Input */}
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setChitValue(Math.max(25000, chitValue - 25000))}
          >
            <Ionicons name="remove" size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.stepperValText}>{formatCurrency(chitValue)}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setChitValue(chitValue + 25000)}
          >
            <Ionicons name="add" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Tenure Selection */}
        <Text style={[styles.cardTitle, { marginTop: 14 }]}>TENURE (MONTHS)</Text>
        <View style={styles.durationRow}>
          {[20, 25, 40, 50].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.durBtn, duration === m && styles.durBtnActive]}
              onPress={() => setDuration(m)}
            >
              <Text style={[styles.durBtnText, duration === m && styles.durBtnTextActive]}>
                {m} Mo
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Auction Winning Bid Discount selector */}
        {scheme === 'AUCTION' && (
          <View style={styles.discountBox}>
            <View style={styles.discountHeader}>
              <Text style={styles.discountLabel}>Avg. Winning Bid Discount</Text>
              <Text style={styles.discountVal}>{avgDiscountPercent}%</Text>
            </View>
            <View style={styles.discountPillsRow}>
              {[15, 20, 25, 30, 35].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.discPill, avgDiscountPercent === d && styles.discPillActive]}
                  onPress={() => setAvgDiscountPercent(d)}
                >
                  <Text style={[styles.discPillText, avgDiscountPercent === d && styles.discPillTextActive]}>
                    {d}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* KPI Stat Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>STANDARD DUE</Text>
          <Text style={styles.kpiVal}>{formatCurrency(calculations.grossMonthlyInstallment)}</Text>
          <Text style={styles.kpiSub}>per month</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <Text style={[styles.kpiLabel, { color: '#1d4ed8' }]}>
            {scheme === 'AUCTION' ? 'EST. NET OUTFLOW' : 'WINNER PAYOUT'}
          </Text>
          <Text style={[styles.kpiVal, { color: '#1e40af' }]}>
            {scheme === 'AUCTION'
              ? `${formatCurrency(calculations.netMonthlyInstallment)}/mo`
              : formatCurrency(calculations.winnerNetPayout)}
          </Text>
          <Text style={styles.kpiSub}>
            {scheme === 'AUCTION'
              ? `Save ~${formatCurrency(calculations.dividendPerMonth)}/mo in div.`
              : 'Full value less 5% foreman fee'}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>FOREMAN FEE (5%)</Text>
          <Text style={styles.kpiVal}>{formatCurrency(calculations.foremanCommissionTotal)}</Text>
          <Text style={styles.kpiSub}>Chit Funds Act, 1982</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.kpiLabel, { color: '#15803d' }]}>
            {scheme === 'AUCTION' ? 'TOTAL DIVIDEND' : 'SAVINGS GOAL'}
          </Text>
          <Text style={[styles.kpiVal, { color: '#166534' }]}>
            {scheme === 'AUCTION'
              ? formatCurrency(calculations.totalDividendPerMember)
              : formatCurrency(chitValue)}
          </Text>
          <Text style={styles.kpiSub}>
            {scheme === 'AUCTION' ? `Yield: ~${calculations.effectiveAnnualYield}%` : `${duration} members`}
          </Text>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'SCHEDULE' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('SCHEDULE')}
        >
          <Ionicons
            name="list-outline"
            size={14}
            color={viewMode === 'SCHEDULE' ? Colors.white : Colors.text}
          />
          <Text style={[styles.viewToggleText, viewMode === 'SCHEDULE' && styles.viewToggleTextActive]}>
            Monthly Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'COMPARISON' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('COMPARISON')}
        >
          <Ionicons
            name="git-compare-outline"
            size={14}
            color={viewMode === 'COMPARISON' ? Colors.white : Colors.text}
          />
          <Text style={[styles.viewToggleText, viewMode === 'COMPARISON' && styles.viewToggleTextActive]}>
            Compare Schemes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode 1: Side-by-Side Scheme Comparison */}
      {viewMode === 'COMPARISON' ? (
        <View style={styles.compareContainer}>
          {/* Auction Scheme Card */}
          <View style={[styles.compareCard, { borderColor: '#818cf8', backgroundColor: '#f5f3ff' }]}>
            <View style={[styles.compareBadge, { backgroundColor: '#4f46e5' }]}>
              <Text style={styles.compareBadgeText}>AUCTION CHIT</Text>
            </View>
            <Text style={styles.compareDesc}>
              Monthly competitive discount auction with dividend redistribution.
            </Text>
            <View style={styles.compareDetails}>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Monthly Due:</Text>
                <Text style={styles.cVal}>{formatCurrency(comparativeData.auction.netInstallment)}/mo</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Est. Total Dividend:</Text>
                <Text style={[styles.cVal, { color: '#15803d' }]}>
                  +{formatCurrency(comparativeData.auction.totalDividend)}
                </Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Borrower Payout:</Text>
                <Text style={styles.cVal}>{formatCurrency(comparativeData.auction.borrowerPayout)}</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Saver Full Payout:</Text>
                <Text style={[styles.cVal, { color: '#4f46e5', fontWeight: '800' }]}>
                  {formatCurrency(comparativeData.auction.saverPayout)}
                </Text>
              </View>
            </View>
          </View>

          {/* Fixed Scheme Card */}
          <View style={[styles.compareCard, { borderColor: '#93c5fd', backgroundColor: '#eff6ff' }]}>
            <View style={[styles.compareBadge, { backgroundColor: '#2563eb' }]}>
              <Text style={styles.compareBadgeText}>FIXED DRAW CHIT</Text>
            </View>
            <Text style={styles.compareDesc}>
              Constant, strictly fixed installments with transparent monthly lucky draws.
            </Text>
            <View style={styles.compareDetails}>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Fixed Monthly Due:</Text>
                <Text style={styles.cVal}>{formatCurrency(comparativeData.fixed.grossInstallment)}/mo</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Dividend:</Text>
                <Text style={styles.cVal}>None (Zero discount)</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Total Contributed:</Text>
                <Text style={styles.cVal}>{formatCurrency(comparativeData.fixed.totalPaid)}</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Guaranteed Net Prize:</Text>
                <Text style={[styles.cVal, { color: '#2563eb', fontWeight: '800' }]}>
                  {formatCurrency(comparativeData.fixed.winnerPayout)}
                </Text>
              </View>
            </View>
          </View>

          {/* Regular Plan Card */}
          <View style={[styles.compareCard, { borderColor: '#86efac', backgroundColor: '#f0fdf4' }]}>
            <View style={[styles.compareBadge, { backgroundColor: '#16a34a' }]}>
              <Text style={styles.compareBadgeText}>REGULAR CHIT (20M)</Text>
            </View>
            <Text style={styles.compareDesc}>
              Brochure rotation scheme following official Tamil Nadu seniority draw turns.
            </Text>
            <View style={styles.compareDetails}>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Fixed Monthly Due:</Text>
                <Text style={styles.cVal}>{formatCurrency(comparativeData.regular.grossInstallment)}/mo</Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Scheduled Turn Prize:</Text>
                <Text style={[styles.cVal, { color: '#16a34a', fontWeight: '800' }]}>
                  {formatCurrency(comparativeData.regular.winnerPayout)}
                </Text>
              </View>
              <View style={styles.cRow}>
                <Text style={styles.cLabel}>Tenure:</Text>
                <Text style={styles.cVal}>20 Months</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        /* Mode 2: Month-by-Month Projection Schedule */
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeaderRow}>
            <Text style={styles.tableHeadCol1}>MONTH</Text>
            <Text style={styles.tableHeadCol2}>DUE (₹)</Text>
            {scheme === 'AUCTION' && <Text style={styles.tableHeadCol3}>DIV (₹)</Text>}
            <Text style={styles.tableHeadCol4}>NET (₹)</Text>
            <Text style={styles.tableHeadCol5}>PAYOUT (₹)</Text>
          </View>

          {projectionSchedule.map((r) => (
            <View key={r.month} style={styles.scheduleDataRow}>
              <Text style={styles.tableCol1}>M{r.month}</Text>
              <Text style={styles.tableCol2}>{formatCurrency(r.baseInstallment)}</Text>
              {scheme === 'AUCTION' && (
                <Text style={[styles.tableCol3, { color: '#15803d' }]}>
                  +{formatCurrency(r.dividend)}
                </Text>
              )}
              <Text style={[styles.tableCol4, { fontWeight: '800', color: '#0f172a' }]}>
                {formatCurrency(r.netPayable)}
              </Text>
              <Text style={[styles.tableCol5, { color: '#2563eb', fontWeight: '700' }]}>
                {formatCurrency(r.winnerPayout)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Compliance Note */}
      <View style={styles.complianceRow}>
        <Ionicons name="shield-checkmark" size={14} color="#2563eb" />
        <Text style={styles.complianceText}>
          Calculated in accordance with Tamil Nadu Chit Funds Rules & Central Act, 1982.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  schemeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 3,
  },
  schemeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  schemeTabActive: {
    backgroundColor: Colors.navy.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  schemeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  schemeTabTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperValText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  durBtnActive: {
    backgroundColor: Colors.navy.primary,
    borderColor: Colors.navy.primary,
  },
  durBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  durBtnTextActive: {
    color: Colors.white,
  },
  discountBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  discountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c1d95',
  },
  discountVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6d28d9',
  },
  discountPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  discPill: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  discPillActive: {
    backgroundColor: '#6d28d9',
    borderColor: '#6d28d9',
  },
  discPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4c1d95',
  },
  discPillTextActive: {
    color: Colors.white,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 2,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.navy.primary,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  viewToggleTextActive: {
    color: Colors.white,
  },
  compareContainer: {
    gap: 10,
  },
  compareCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  compareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  compareBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.white,
  },
  compareDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    marginBottom: 10,
  },
  compareDetails: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  cRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  cVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  scheduleCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeadCol1: { width: '15%', fontSize: 9, fontWeight: '800', color: '#64748b' },
  tableHeadCol2: { width: '22%', fontSize: 9, fontWeight: '800', color: '#64748b' },
  tableHeadCol3: { width: '20%', fontSize: 9, fontWeight: '800', color: '#64748b' },
  tableHeadCol4: { width: '22%', fontSize: 9, fontWeight: '800', color: '#64748b' },
  tableHeadCol5: { width: '21%', fontSize: 9, fontWeight: '800', color: '#64748b' },
  scheduleDataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCol1: { width: '15%', fontSize: 10, fontWeight: '700', color: '#334155' },
  tableCol2: { width: '22%', fontSize: 10, color: '#475569' },
  tableCol3: { width: '20%', fontSize: 10, fontWeight: '600' },
  tableCol4: { width: '22%', fontSize: 10 },
  tableCol5: { width: '21%', fontSize: 10 },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  complianceText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
});
