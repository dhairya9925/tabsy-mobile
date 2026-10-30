import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SharedStackParamList } from '../../navigation/types';
import { colors, useTheme, radii, spacing, fontFamilies } from '../../theme';
import {
  SproutText,
  CircleButton,
  SproutButton,
  SettlementRecordCard,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { GroupSettlementRecord } from '../../types';
import { formatCurrencyExact, getRemainingWindow } from '../../utils/formatters';
import {
  ArrowLeft,
  Receipt,
  Clock,
  ShieldCheck,
  X,
  FileText,
  Filter,
} from 'lucide-react-native';

type Props = NativeStackScreenProps<SharedStackParamList, 'SettlementRecords'>;

export const SettlementRecordsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const { colors, isDark } = useTheme();

  const [records, setRecords] = useState<GroupSettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit Note Modal state
  const [editingRecord, setEditingRecord] = useState<GroupSettlementRecord | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load records
  const loadRecords = useCallback(async () => {
    try {
      const data = await groupsApi.getSettlementRecords(groupId);
      setRecords(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load settlement records');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRecords();
  };

  // Compute summary stats
  const { totalSettledAmount, activeEditableCount } = useMemo(() => {
    let total = 0;
    let editable = 0;
    records.forEach((r) => {
      total += r.amount;
      const status = getRemainingWindow(r.editable_until);
      if (r.is_editable && status.isEditable && !r.is_disputed) {
        editable += 1;
      }
    });
    return { totalSettledAmount: total, activeEditableCount: editable };
  }, [records]);

  // Open Edit Note modal
  const handleOpenEditNote = (record: GroupSettlementRecord) => {
    setEditingRecord(record);
    setEditNoteText(record.note || '');
  };

  // Save updated note
  const handleSaveNote = async () => {
    if (!editingRecord) return;
    setIsSavingNote(true);
    Keyboard.dismiss();
    try {
      const updated = await groupsApi.updateSettlementRecord(groupId, editingRecord.id, {
        note: editNoteText.trim() || undefined,
      });

      // Update local state
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, note: updated.note ?? editNoteText.trim() } : r))
      );
      setSuccessMessage('Settlement note updated.');
      setEditingRecord(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update note');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Confirm and reverse settlement
  const handleReverse = (record: GroupSettlementRecord) => {
    Alert.alert(
      'Reverse Settlement?',
      `Are you sure you want to reverse this settlement of ${formatCurrencyExact(record.amount)} between ${record.from_name || 'Member'} and ${record.to_name || 'Member'}?\n\nThis will reopen the expense splits and restore member balances.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.deleteSettlementRecord(groupId, record.id);
              setRecords((prev) => prev.filter((r) => r.id !== record.id));
              setSuccessMessage('Settlement reversed. Splits have been reopened.');
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to reverse settlement');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />
      <Toast
        visible={!!successMessage}
        message={successMessage}
        type="success"
        onDismiss={() => setSuccessMessage('')}
      />

      {/* Screen Header */}
      <View style={styles.header}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.headerTitleCol}>
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Settlement History
          </SproutText>
          {groupName ? (
            <SproutText variant="caption" color={colors.muted} numberOfLines={1}>
              {groupName}
            </SproutText>
          ) : null}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Summary Metric Header Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.1 }}>
                TOTAL SETTLED
              </SproutText>
              <SproutText variant="title" color={colors.accent} weight="800" style={styles.summaryAmount}>
                {formatCurrencyExact(totalSettledAmount)}
              </SproutText>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.line }]} />

            <View style={styles.summaryItem}>
              <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.1 }}>
                RECORDS
              </SproutText>
              <SproutText variant="title" color={colors.text} weight="800" style={styles.summaryAmount}>
                {records.length}
              </SproutText>
            </View>

            {activeEditableCount > 0 && (
              <>
                <View style={[styles.summaryDivider, { backgroundColor: colors.line }]} />
                <View style={styles.summaryItem}>
                  <SproutText variant="eyebrow" color={colors.accent} style={{ letterSpacing: 1.1 }}>
                    EDITABLE
                  </SproutText>
                  <View style={[styles.editablePill, { backgroundColor: colors.accentSoft }]}>
                    <Clock size={11} color={colors.accent} style={{ marginRight: 3 }} />
                    <SproutText variant="caption" color={colors.accent} weight="700">
                      {activeEditableCount} active
                    </SproutText>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Audit Trail Guarantee Footnote */}
          <View style={[styles.guaranteeRow, { backgroundColor: colors.surfaceElevated }]}>
            <ShieldCheck size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <SproutText variant="caption" color={colors.muted} style={{ flex: 1, fontSize: 11 }}>
              Visible to all group members. Editable and reversible for 3 days after creation.
            </SproutText>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <SproutText variant="eyebrow" color={colors.muted} style={{ letterSpacing: 1.2 }}>
            ALL SETTLEMENT RECORDS
          </SproutText>
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
            <SproutText variant="caption" color={colors.muted} style={{ marginTop: 8 }}>
              Loading settlement records...
            </SproutText>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && records.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accentSoft }]}>
              <Receipt size={32} color={colors.accent} strokeWidth={1.75} />
            </View>
            <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.emptyTitle}>
              No Settlements Yet
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.emptyDesc}>
              When group members settle balances via the Settle Up action, receipts with a 3-day edit audit window will appear here.
            </SproutText>
          </View>
        )}

        {/* Records List */}
        {!isLoading &&
          records.map((record) => (
            <SettlementRecordCard
              key={record.id}
              record={record}
              onEditNote={handleOpenEditNote}
              onReverse={handleReverse}
            />
          ))}
      </ScrollView>

      {/* Edit Note Modal */}
      <Modal
        visible={!!editingRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRecord(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditingRecord(null)}
          />

          <View style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.editHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FileText size={18} color={colors.accent} style={{ marginRight: 6 }} />
                <SproutText variant="title" color={colors.text} weight="700" style={{ fontSize: 17 }}>
                  Edit Settlement Note
                </SproutText>
              </View>
              <TouchableOpacity
                onPress={() => setEditingRecord(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {editingRecord && (
              <SproutText variant="caption" color={colors.muted} style={{ marginBottom: spacing.sm }}>
                {editingRecord.from_name} → {editingRecord.to_name} • {formatCurrencyExact(editingRecord.amount)}
              </SproutText>
            )}

            <TextInput
              style={[styles.modalTextInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.line, color: colors.text }]}
              placeholder="e.g. Paid via Google Pay, UPI ref 123456..."
              placeholderTextColor={colors.muted}
              value={editNoteText}
              onChangeText={setEditNoteText}
              maxLength={255}
              multiline
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line }]}
                onPress={() => setEditingRecord(null)}
              >
                <SproutText variant="body" color={colors.muted} weight="600">
                  Cancel
                </SproutText>
              </TouchableOpacity>

              <SproutButton
                label="Save Note"
                isLoading={isSavingNote}
                onPress={handleSaveNote}
                style={styles.saveBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.line,
  },
  summaryAmount: {
    fontSize: 19,
    marginTop: 3,
  },
  editablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginTop: 4,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: spacing.xl,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  editCard: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTextInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.medium,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    minWidth: 120,
  },
});
