import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { GroupSettlementRecord } from '../types';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { SproutText } from './SproutText';
import { AvatarCircle } from './AvatarCircle';
import { formatCurrencyExact, formatDateTime, getRemainingWindow } from '../utils/formatters';
import {
  Clock,
  Lock,
  Pencil,
  RotateCcw,
  ArrowRight,
  FileText,
  AlertTriangle,
  Receipt,
} from 'lucide-react-native';

export interface SettlementRecordCardProps {
  record: GroupSettlementRecord;
  onEditNote?: (record: GroupSettlementRecord) => void;
  onReverse?: (record: GroupSettlementRecord) => void;
}

export const SettlementRecordCard: React.FC<SettlementRecordCardProps> = ({
  record,
  onEditNote,
  onReverse,
}) => {
  const windowStatus = getRemainingWindow(record.editable_until);
  const isEditable = record.is_editable && windowStatus.isEditable && !record.is_disputed;

  const shortRefId = record.id.startsWith('sr-')
    ? record.id.toUpperCase()
    : `#SR-${record.id.slice(0, 8).toUpperCase()}`;

  return (
    <View style={styles.card}>
      {/* Top Meta Row */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Receipt size={14} color={colors.accent} style={{ marginRight: 5 }} />
          <SproutText variant="caption" color={colors.muted} weight="600" style={{ fontSize: 11 }}>
            {formatDateTime(record.created_at)}
          </SproutText>
          <SproutText variant="caption" color={colors.line} style={{ marginHorizontal: 6 }}>
            •
          </SproutText>
          <SproutText variant="caption" color={colors.muted} weight="700" style={{ fontSize: 11 }}>
            {shortRefId}
          </SproutText>
        </View>

        {/* 3-day Window Status Badge */}
        {record.is_disputed ? (
          <View style={[styles.badge, styles.disputedBadge]}>
            <AlertTriangle size={11} color={colors.negative} style={{ marginRight: 3 }} />
            <SproutText variant="caption" color={colors.negative} weight="700" style={styles.badgeText}>
              Disputed
            </SproutText>
          </View>
        ) : isEditable ? (
          <View style={[styles.badge, styles.editableBadge]}>
            <Clock size={11} color={colors.accent} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.accent} weight="700" style={styles.badgeText}>
              {windowStatus.label}
            </SproutText>
          </View>
        ) : (
          <View style={[styles.badge, styles.lockedBadge]}>
            <Lock size={11} color={colors.muted} style={{ marginRight: 3 }} />
            <SproutText variant="caption" color={colors.muted} weight="600" style={styles.badgeText}>
              Locked
            </SproutText>
          </View>
        )}
      </View>

      {/* Main Body: Flow & Amount */}
      <View style={styles.bodyRow}>
        {/* Payer and Recipient */}
        <View style={styles.membersFlow}>
          <View style={styles.memberCol}>
            <AvatarCircle name={record.from_name || 'Member'} size={32} />
            <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1} style={styles.memberName}>
              {record.from_name || 'Member'}
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.roleSubtext}>
              Payer
            </SproutText>
          </View>

          <View style={styles.arrowWrap}>
            <ArrowRight size={16} color={colors.accent} strokeWidth={2.5} />
          </View>

          <View style={styles.memberCol}>
            <AvatarCircle name={record.to_name || 'Member'} size={32} />
            <SproutText variant="body" color={colors.text} weight="700" numberOfLines={1} style={styles.memberName}>
              {record.to_name || 'Member'}
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.roleSubtext}>
              Recipient
            </SproutText>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountCol}>
          <SproutText variant="title" color={colors.accent} weight="800" style={styles.amountText}>
            {formatCurrencyExact(record.amount)}
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={{ fontSize: 10 }}>
            Settled Net
          </SproutText>
        </View>
      </View>

      {/* Note Section if present */}
      {record.note ? (
        <View style={styles.noteBox}>
          <FileText size={12} color={colors.muted} style={{ marginRight: 6, marginTop: 2 }} />
          <SproutText variant="caption" color={colors.text} weight="500" style={styles.noteText}>
            "{record.note}"
          </SproutText>
        </View>
      ) : null}

      {/* Footer: Settled by & Action buttons */}
      <View style={styles.footerRow}>
        <SproutText variant="caption" color={colors.muted} style={styles.settledByText}>
          Settled by <SproutText variant="caption" color={colors.text} weight="600">{record.settled_by_name || 'Member'}</SproutText>
        </SproutText>

        {/* Actions inside 3-day window */}
        {isEditable && (
          <View style={styles.actionsGroup}>
            {onEditNote && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionBtn}
                onPress={() => onEditNote(record)}
              >
                <Pencil size={12} color={colors.accent} style={{ marginRight: 4 }} />
                <SproutText variant="caption" color={colors.accent} weight="700" style={styles.actionBtnText}>
                  {record.note ? 'Edit Note' : 'Add Note'}
                </SproutText>
              </TouchableOpacity>
            )}

            {onReverse && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.actionBtn, styles.reverseBtn]}
                onPress={() => onReverse(record)}
              >
                <RotateCcw size={12} color={colors.negative} style={{ marginRight: 4 }} />
                <SproutText variant="caption" color={colors.negative} weight="700" style={styles.actionBtnText}>
                  Reverse
                </SproutText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 10.5,
  },
  editableBadge: {
    backgroundColor: colors.accentSoft,
  },
  lockedBadge: {
    backgroundColor: '#EBEFEA',
  },
  disputedBadge: {
    backgroundColor: colors.negativeSoft,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  membersFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  memberCol: {
    alignItems: 'center',
    width: 68,
  },
  memberName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  roleSubtext: {
    fontSize: 9.5,
  },
  arrowWrap: {
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  settledByText: {
    fontSize: 11,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  reverseBtn: {
    backgroundColor: colors.negativeSoft,
  },
  actionBtnText: {
    fontSize: 11,
  },
});
