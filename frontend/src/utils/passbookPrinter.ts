// Utility for generating and printing / saving official Jenista Chits Digital Passbooks as PDF

export interface PassbookTxn {
  id: string;
  date: string;
  description: string;
  reference?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  paymentMode?: string;
  runningBalance: number;
}

export interface PassbookStatementData {
  customerName: string;
  customerId: string;
  customerMobile?: string;
  customerEmail?: string;
  customerAddress?: string;
  groupScope?: string;
  totalPaid: number;
  totalWithdrawn: number;
  currentBalance: number;
  pendingDue?: number;
  transactions: PassbookTxn[];
}

export const downloadPassbookPDF = (data: PassbookStatementData) => {
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const generatedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const groupTitle = data.groupScope && data.groupScope !== 'ALL'
    ? `Group: ${data.groupScope}`
    : 'All Chit Groups (Consolidated)';

  // Calculate totals
  const totalCredits = data.transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalDebits = data.transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netBalance = totalCredits - totalDebits;

  const rowsHtml = data.transactions.map((t, index) => {
    const isCredit = t.type === 'CREDIT';
    const isCash = (t.description || '').toLowerCase().includes('cash') || (t.paymentMode || '').toLowerCase().includes('cash');
    const modeBadge = isCash ? '<span class="badge cash">CASH</span>' : (t.paymentMode ? `<span class="badge online">${t.paymentMode}</span>` : '');
    const dateFormatted = new Date(t.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const balanceClass = t.runningBalance >= 0 ? 'text-balance-pos' : 'text-balance-neg';
    const balanceSign = t.runningBalance < 0 ? '-' : '';
    const formattedBalance = `${balanceSign}₹${Math.abs(t.runningBalance).toLocaleString('en-IN')}`;

    return `
      <tr class="${index % 2 === 0 ? 'even-row' : ''}">
        <td class="col-date">${dateFormatted}</td>
        <td class="col-desc">
          <div class="desc-text">${t.description}</div>
          ${modeBadge}
        </td>
        <td class="col-ref">${t.id || t.reference || '—'}</td>
        <td class="col-debit">${!isCredit ? `₹${Number(t.amount).toLocaleString('en-IN')}` : '—'}</td>
        <td class="col-credit">${isCredit ? `₹${Number(t.amount).toLocaleString('en-IN')}` : '—'}</td>
        <td class="col-bal ${balanceClass}">${formattedBalance}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Jenista_Passbook_${data.customerId}_${new Date().toISOString().split('T')[0]}.pdf</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            padding: 10px;
          }
          .passbook-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
          }
          
          /* Header Banner */
          .header-banner {
            background: #0f172a;
            color: #ffffff;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #f59e0b;
          }
          .company-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .tree-logo {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #fef3c7;
            border: 2px solid #d97706;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
          }
          .company-name {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #fbbf24;
            text-transform: uppercase;
          }
          .company-sub {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 2px;
            line-height: 1.3;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h2 {
            font-size: 13px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-badge p {
            font-size: 9px;
            color: #fbbf24;
            font-weight: 700;
            margin-top: 2px;
          }

          /* Info Grid */
          .info-strip {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 18px;
            display: grid;
            grid-template-columns: 2fr 1.5fr;
            gap: 16px;
          }
          .info-card {
            font-size: 10.5px;
          }
          .info-row {
            display: flex;
            margin-bottom: 4px;
          }
          .info-label {
            width: 110px;
            color: #64748b;
            font-weight: 600;
          }
          .info-val {
            color: #0f172a;
            font-weight: 700;
          }
          .info-val.highlight {
            color: #b45309;
          }

          /* Summary Box */
          .summary-strip {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            border-bottom: 2px solid #e2e8f0;
            background: #ffffff;
          }
          .summary-cell {
            padding: 10px 16px;
            border-right: 1px solid #e2e8f0;
            text-align: center;
          }
          .summary-cell:last-child {
            border-right: none;
          }
          .summary-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            display: block;
            margin-bottom: 3px;
          }
          .summary-num {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.3px;
          }
          .summary-credit { color: #059669; }
          .summary-debit { color: #dc2626; }
          .summary-bal { color: #0f172a; }

          /* Statement Table */
          .table-container {
            padding: 0;
            background: #ffffff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          thead tr {
            background: #f1f5f9;
            border-bottom: 2px solid #cbd5e1;
          }
          th {
            padding: 8px 10px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          .even-row {
            background-color: #fafbfc;
          }
          .col-date {
            width: 80px;
            font-weight: 600;
            color: #334155;
            white-space: nowrap;
          }
          .col-desc {
            font-weight: 600;
            color: #0f172a;
          }
          .desc-text {
            display: inline;
          }
          .col-ref {
            width: 110px;
            font-family: monospace;
            font-size: 9.5px;
            color: #64748b;
            white-space: nowrap;
          }
          .col-debit {
            width: 90px;
            text-align: right;
            font-weight: 700;
            color: #dc2626;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .col-credit {
            width: 90px;
            text-align: right;
            font-weight: 700;
            color: #059669;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .col-bal {
            width: 100px;
            text-align: right;
            font-weight: 800;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .text-balance-pos {
            color: #0f172a;
          }
          .text-balance-neg {
            color: #b91c1c;
          }

          .badge {
            display: inline-block;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 3px;
            text-transform: uppercase;
            margin-left: 5px;
            vertical-align: middle;
          }
          .badge.cash {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .badge.online {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }

          /* Total Row */
          .total-row td {
            background: #f8fafc;
            border-top: 2px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
            font-weight: 900;
            font-size: 11px;
            padding: 9px 10px;
          }

          /* Footer Signatures */
          .footer-section {
            padding: 20px 24px 16px;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
          }
          .sig-box {
            text-align: center;
            width: 180px;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 4px;
          }
          .sig-title {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .disclaimer {
            margin-top: 18px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8.5px;
            color: #94a3b8;
            text-align: center;
            line-height: 1.4;
          }

          /* Print controls */
          .print-bar {
            text-align: center;
            padding: 12px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
          }
          .print-btn {
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .print-btn:hover {
            background: #1e293b;
          }

          @media print {
            .print-bar { display: none !important; }
            body { padding: 0; }
            .passbook-container { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-bar">
          <button class="print-btn" onclick="window.print()">📥 Print or Save Passbook as PDF</button>
        </div>

        <div class="passbook-container">
          <!-- Top Header -->
          <div class="header-banner">
            <div class="company-brand">
              <div class="tree-logo">🌳</div>
              <div>
                <div class="company-name">JENISTA CHITS PVT. LTD.</div>
                <div class="company-sub">
                  CIN: U67190TZ2020PTC033361 • Head Office: Pudukkottai, Thoothukudi - 628 103<br/>
                  Branch: Hosur • Mob: 70942 95556, 70940 45556 • Email: jenistachits@gmail.com
                </div>
              </div>
            </div>
            <div class="doc-badge">
              <h2>Digital Passbook</h2>
              <p>STATEMENT OF ACCOUNT</p>
            </div>
          </div>

          <!-- Customer & Scope Info -->
          <div class="info-strip">
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Customer Name:</span>
                <span class="info-val">${data.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Member Code:</span>
                <span class="info-val highlight">${data.customerId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile Number:</span>
                <span class="info-val">${data.customerMobile || '—'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Statement Scope:</span>
                <span class="info-val">${groupTitle}</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Statement Date:</span>
                <span class="info-val">${generatedDate} · ${generatedTime}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Passbook Status:</span>
                <span class="info-val" style="color: #059669;">Verified Active ✓</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Entries:</span>
                <span class="info-val">${data.transactions.length} Records</span>
              </div>
            </div>
          </div>

          <!-- Financial Summary Strip -->
          <div class="summary-strip">
            <div class="summary-cell">
              <span class="summary-label">Total Amount Paid (Credit)</span>
              <span class="summary-num summary-credit">₹${totalCredits.toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-cell">
              <span class="summary-label">Total Prize Disbursed (Debit)</span>
              <span class="summary-num summary-debit">${totalDebits > 0 ? `₹${totalDebits.toLocaleString('en-IN')}` : '₹0'}</span>
            </div>
            <div class="summary-cell">
              <span class="summary-label">Net Passbook Balance</span>
              <span class="summary-num summary-bal">${netBalance < 0 ? '-' : ''}₹${Math.abs(netBalance).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Particulars</th>
                  <th>Ref / Txn ID</th>
                  <th style="text-align: right;">Debit (-)</th>
                  <th style="text-align: right;">Credit (+)</th>
                  <th style="text-align: right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
                      No passbook transactions recorded.
                    </td>
                  </tr>
                `}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Transactions Summary:</td>
                  <td class="col-debit" style="font-size: 11px;">₹${totalDebits.toLocaleString('en-IN')}</td>
                  <td class="col-credit" style="font-size: 11px;">₹${totalCredits.toLocaleString('en-IN')}</td>
                  <td class="col-bal" style="font-size: 11px; color: #0f172a;">${netBalance < 0 ? '-' : ''}₹${Math.abs(netBalance).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer Signatures & Disclaimer -->
          <div class="footer-section">
            <div class="sig-row">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">Member Signature</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">Cashier / Staff In-Charge</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">For Jenista Chits Pvt Ltd<br/>(Authorized Signatory)</div>
              </div>
            </div>
            <div class="disclaimer">
              This statement of account is an authentic computer-generated digital passbook issued by Jenista Chits Private Limited.<br/>
              Installment credits are subject to realization. For any discrepancies, please contact branch office within 7 days.
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  // Create an iframe to print cleanly without popup blocker issues
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Trigger print once iframe is loaded
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        // Fallback to window.open if iframe print fails
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000); // keep until print dialog completes
      }
    }, 500);
  }
};
