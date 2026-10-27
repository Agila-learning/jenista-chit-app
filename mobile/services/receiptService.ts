import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency, formatDate } from '../utils/format';

export interface ReceiptDetails {
  receiptNo: string;
  date?: string | Date;
  customerName?: string;
  customerId?: string;
  customerMobile?: string;
  groupName?: string;
  ticketNumber?: string;
  paymentMode?: string;
  amount: number | string;
  description?: string;
  referenceNo?: string;
  collectedBy?: string;
}

export const generateAndShareReceipt = async (data: ReceiptDetails): Promise<void> => {
  const isCash =
    (data.paymentMode || '').toLowerCase().includes('cash') ||
    (data.description || '').toLowerCase().includes('cash');
  const mode = isCash ? 'CASH' : data.paymentMode || 'Online Payment';
  const dateStr = formatDate(data.date || new Date());
  const receiptNo = data.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
  const custName = data.customerName || 'Customer';
  const custId = data.customerId || 'CUST';
  const custPhone = data.customerMobile || '—';
  const grpName = data.groupName || 'Chit Fund Group';
  const amountVal = formatCurrency(data.amount || 0);
  const cashier = data.collectedBy || 'Jenista Cash Counter';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${receiptNo}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #ca8a04; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; color: #713f12; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
          .badge { display: inline-block; background: #fef08a; color: #854d0e; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-top: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { color: #64748b; font-weight: 500; }
          .value { font-weight: 600; color: #0f172a; }
          .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; margin: 16px 0; }
          .amount-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
          .amount-val { font-size: 24px; font-weight: bold; color: #059669; }
          .footer { border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">JENISTA CHITS PVT LTD</h1>
          <p class="subtitle">Reg No: U67190TZ2020PTC033361 | Thoothukudi, Tamil Nadu</p>
          <div class="badge">OFFICIAL PAYMENT RECEIPT</div>
        </div>

        <div class="row">
          <span class="label">Receipt No:</span>
          <span class="value">${receiptNo}</span>
        </div>
        <div class="row">
          <span class="label">Date:</span>
          <span class="value">${dateStr}</span>
        </div>
        <div class="row">
          <span class="label">Customer Name:</span>
          <span class="value">${custName}</span>
        </div>
        <div class="row">
          <span class="label">Customer ID / Mobile:</span>
          <span class="value">${custId} (${custPhone})</span>
        </div>
        <div class="row">
          <span class="label">Chit Group:</span>
          <span class="value">${grpName}</span>
        </div>
        <div class="row">
          <span class="label">Payment Mode:</span>
          <span class="value">${mode}</span>
        </div>
        ${data.referenceNo ? `<div class="row"><span class="label">Ref / TXN:</span><span class="value">${data.referenceNo}</span></div>` : ''}

        <div class="amount-box">
          <div class="amount-label">Amount Received</div>
          <div class="amount-val">${amountVal}</div>
        </div>

        <div class="row">
          <span class="label">Collected By:</span>
          <span class="value">${cashier}</span>
        </div>

        <div class="footer">
          Computer generated receipt. For queries, contact info@jenistachits.com
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    }
  } catch (err) {
    console.warn('Could not generate receipt PDF:', err);
  }
};
