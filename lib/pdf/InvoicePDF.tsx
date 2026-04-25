import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { IInvoice, IInvoiceLineItem } from '@/lib/models/Invoice';
import type { Types } from 'mongoose';
import { formatCurrency } from '@/lib/utils/formatCurrency';

// ── Types ──────────────────────────────────────────────────────────────

export interface InvoicePDFProps {
  invoice: IInvoice & { _id: Types.ObjectId };
  business: { name: string; region: string };
}

// ── Helpers ────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(d: Date | string): string {
  return DATE_FMT.format(new Date(d));
}

// ── Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1A1A1A',
    paddingTop: 48,
    paddingBottom: 72,
    paddingHorizontal: 48,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  businessName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  businessRegion: {
    fontSize: 11,
    color: '#666666',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#D4AF64',
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#666666',
    marginBottom: 3,
  },
  headerMeta: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 2,
  },
  headerMetaAmber: {
    fontSize: 11,
    color: '#D4AF64',
    marginBottom: 2,
  },

  // Bill To
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  billToName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  billToDetail: {
    fontSize: 11,
    color: '#444444',
    marginBottom: 2,
  },

  // Table
  table: {
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: '#F9F9F9',
  },
  colDescription: { flex: 3 },
  colQty: { flex: 0.5, textAlign: 'right' },
  colUnitPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  cellDesc: {
    fontSize: 10,
    color: '#1A1A1A',
  },
  cellNum: {
    fontSize: 10,
    color: '#444444',
  },

  // Totals
  totalsWrap: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalsBlock: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#444444',
  },
  totalsValue: {
    fontSize: 10,
    color: '#444444',
  },
  totalsDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#D4AF64',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#D4AF64',
  },

  // Notes
  notesText: {
    fontSize: 10,
    color: '#444444',
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    alignItems: 'center',
  },
  footerLine1: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
  },
  footerLine2: {
    fontSize: 9,
    color: '#BBBBBB',
  },
});

// ── Sub-components ─────────────────────────────────────────────────────

function TableRow({
  item,
  index,
}: {
  item: IInvoiceLineItem;
  index: number;
}) {
  const isAlt = index % 2 === 1;
  return (
    <View style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}>
      <View style={s.colDescription}>
        <Text style={s.cellDesc}>{item.description}</Text>
      </View>
      <View style={s.colQty}>
        <Text style={s.cellNum}>{item.quantity}</Text>
      </View>
      <View style={s.colUnitPrice}>
        <Text style={s.cellNum}>{formatCurrency(item.unitPrice)}</Text>
      </View>
      <View style={s.colTotal}>
        <Text style={s.cellNum}>{formatCurrency(item.total)}</Text>
      </View>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function InvoicePDF({ invoice, business }: InvoicePDFProps) {
  const isPastDue =
    invoice.dueDate && new Date(invoice.dueDate) < new Date();

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.businessName}>{business.name}</Text>
            <Text style={s.businessRegion}>{business.region}</Text>
          </View>

          <View style={s.headerRight}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={s.headerMeta}>
              Date: {formatDate(invoice.createdAt)}
            </Text>
            <Text style={isPastDue ? s.headerMetaAmber : s.headerMeta}>
              Due: {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        {/* ── Bill To ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Bill To</Text>
          <Text style={s.billToName}>{invoice.customerName}</Text>
          {!!invoice.customerAddress && (
            <Text style={s.billToDetail}>{invoice.customerAddress}</Text>
          )}
          {!!invoice.customerPhone && (
            <Text style={s.billToDetail}>{invoice.customerPhone}</Text>
          )}
          {!!invoice.customerEmail && (
            <Text style={s.billToDetail}>{invoice.customerEmail}</Text>
          )}
        </View>

        {/* ── Line Items Table ── */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.tableHeaderRow}>
            <View style={s.colDescription}>
              <Text style={s.tableHeaderCell}>Description</Text>
            </View>
            <View style={s.colQty}>
              <Text style={s.tableHeaderCell}>Qty</Text>
            </View>
            <View style={s.colUnitPrice}>
              <Text style={s.tableHeaderCell}>Unit Price</Text>
            </View>
            <View style={s.colTotal}>
              <Text style={s.tableHeaderCell}>Total</Text>
            </View>
          </View>

          {/* Data rows */}
          {invoice.lineItems.map((item, i) => (
            <TableRow key={i} item={item} index={i} />
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBlock}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>

            {invoice.taxRate > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={s.totalsValue}>{formatCurrency(invoice.taxTotal)}</Text>
              </View>
            )}

            <View style={s.totalsDivider} />

            <View style={s.totalsRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {!!invoice.notes && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer (fixed at page bottom) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLine1}>
            Thank you for your business, {invoice.customerName}.
          </Text>
          <Text style={s.footerLine2}>{business.name}</Text>
        </View>
      </Page>
    </Document>
  );
}
