// Utility for printing official Jenista Chits payment receipt vouchers

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

// Convert numbers to Indian Rupees in words
function numberToWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
  
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 10) return single[n];
    if (n >= 10 && n < 20) return double[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + single[n % 10] : '');
  };

  const convertThreeDigits = (n: number): string => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  };

  let integerPart = Math.floor(num);
  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  if (crore > 0) {
    words += convertThreeDigits(crore) + ' Crore ';
  }

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  if (lakh > 0) {
    words += convertThreeDigits(lakh) + ' Lakh ';
  }

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  if (thousand > 0) {
    words += convertThreeDigits(thousand) + ' Thousand ';
  }

  if (integerPart > 0) {
    words += convertThreeDigits(integerPart);
  }

  return (words.trim() || 'Zero') + ' Rupees Only';
}

export const printCashReceipt = (data: ReceiptDetails) => {
  const isCash = (data.paymentMode || '').toLowerCase().includes('cash') || 
                 (data.description || '').toLowerCase().includes('cash') || 
                 (data.referenceNo || '').toLowerCase().includes('cash');
  const mode = isCash ? 'CASH' : (data.paymentMode || 'Online Payment');
  
  const dateObj = data.date ? new Date(data.date) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const receiptNo = data.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
  const custName = data.customerName || 'Customer';
  const custId = data.customerId || 'TC-73071';
  const custPhone = data.customerMobile || '';
  const grpName = data.groupName || 'Chit Fund Group';
  const amountVal = Number(data.amount || 0);
  const wordsStr = numberToWordsINR(amountVal);
  const cashier = data.collectedBy || 'Jenista Cash Counter';

  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up blocked! Please allow pop-ups to print the receipt.');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Receipt_${receiptNo}_${custName.replace(/\\s+/g, '_')}</title>
        <style>
          @media print {
            @page {
              size: 105mm 160mm;
              margin: 6mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: #fff !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .voucher {
              box-shadow: none !important;
              border: 1.5px solid #000 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            background: #f1f5f9;
            padding: 24px 16px;
            color: #0f172a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .toolbar {
            width: 100%;
            max-width: 440px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background: #047857;
            color: #fff;
            border: none;
            padding: 8px 18px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .btn-print:hover {
            background: #065f46;
          }
          .voucher {
            background: #fff;
            width: 100%;
            max-width: 440px;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            padding: 22px 20px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #94a3b8;
            padding-bottom: 14px;
            margin-bottom: 14px;
          }
          .company-name {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .tagline {
            font-size: 11px;
            color: #475569;
            font-weight: 600;
            margin-top: 2px;
          }
          .reg-info {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 2px;
          }
          .receipt-type-badge {
            display: inline-block;
            background: ${isCash ? '#ecfdf5' : '#eff6ff'};
            color: ${isCash ? '#065f46' : '#1e40af'};
            border: 1.5px solid ${isCash ? '#10b981' : '#3b82f6'};
            font-size: 11px;
            font-weight: 900;
            padding: 3px 12px;
            border-radius: 9999px;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .meta-grid {
            display: flex;
            flex-direction: column;
            gap: 7px;
            font-size: 12.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .meta-label {
            color: #64748b;
            font-size: 11.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .meta-val {
            font-weight: 700;
            color: #0f172a;
            text-align: right;
          }
          .divider {
            border-top: 1px dashed #cbd5e1;
            margin: 10px 0;
          }
          .amount-box {
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
            margin: 12px 0 6px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .amount-label {
            font-size: 11.5px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .amount-val {
            font-size: 24px;
            font-weight: 900;
            color: ${isCash ? '#047857' : '#0369a1'};
            letter-spacing: -0.5px;
          }
          .amount-words {
            font-size: 11px;
            font-style: italic;
            color: #475569;
            text-align: right;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
          }
          .sign-col {
            text-align: center;
            font-size: 10.5px;
            color: #64748b;
            font-weight: 600;
          }
          .sign-line {
            margin-top: 26px;
            border-top: 1px solid #94a3b8;
            width: 115px;
          }
          .footer {
            text-align: center;
            font-size: 9.5px;
            color: #94a3b8;
            margin-top: 18px;
            line-height: 1.4;
          }
          .cash-watermark {
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-25deg);
            font-size: 52px;
            font-weight: 900;
            color: rgba(16, 185, 129, 0.07);
            letter-spacing: 6px;
            text-transform: uppercase;
            pointer-events: none;
            user-select: none;
          }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">Receipt Preview</span>
          <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
        </div>

        <div class="voucher">
          ${isCash ? '<div class="cash-watermark">PAID CASH</div>' : ''}
          <div class="header">
            <div class="company-name">Jenista Chits Pvt Ltd</div>
            <div class="tagline">Government Registered Chit Fund Company</div>
            <div class="reg-info">Reg. Under Chit Funds Act 1982 · CIN: U65992TN2020PTC018290</div>
            <div class="receipt-type-badge">
              ${isCash ? '💵 Cash Payment Receipt Voucher' : '💳 Official Payment Receipt'}
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-row">
              <span class="meta-label">Receipt Number</span>
              <span class="meta-val" style="font-family: monospace; font-size: 13.5px;">${receiptNo}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Date & Time</span>
              <span class="meta-val">${dateStr} · ${timeStr}</span>
            </div>
            
            <div class="divider"></div>

            <div class="meta-row">
              <span class="meta-label">Customer Name</span>
              <span class="meta-val">${custName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Customer Code</span>
              <span class="meta-val" style="font-family: monospace;">${custId}</span>
            </div>
            ${custPhone ? `
            <div class="meta-row">
              <span class="meta-label">Mobile Number</span>
              <span class="meta-val">${custPhone}</span>
            </div>` : ''}

            <div class="divider"></div>

            <div class="meta-row">
              <span class="meta-label">Chit Scheme / Group</span>
              <span class="meta-val">${grpName}</span>
            </div>
            ${data.ticketNumber ? `
            <div class="meta-row">
              <span class="meta-label">Ticket Number</span>
              <span class="meta-val">#${data.ticketNumber}</span>
            </div>` : ''}
            <div class="meta-row">
              <span class="meta-label">Payment Mode</span>
              <span class="meta-val" style="color: ${isCash ? '#047857' : '#0369a1'}; font-weight: 800;">
                ${mode}
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Particulars</span>
              <span class="meta-val">${data.description || 'Monthly Chit Installment'}</span>
            </div>
            ${data.referenceNo ? `
            <div class="meta-row">
              <span class="meta-label">Reference No.</span>
              <span class="meta-val" style="font-family: monospace;">${data.referenceNo}</span>
            </div>` : ''}
          </div>

          <div class="amount-box">
            <span class="amount-label">Total Amount Paid</span>
            <span class="amount-val">₹${amountVal.toLocaleString('en-IN')}</span>
          </div>
          <div class="amount-words">(${wordsStr})</div>

          <div class="signatures">
            <div class="sign-col">
              <div class="sign-line"></div>
              <span>Member Signature</span>
            </div>
            <div class="sign-col">
              <div class="sign-line"></div>
              <span>${cashier}</span>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 1px;">Authorized Seal</div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-verified official receipt issued by Jenista Chits Pvt Ltd.</p>
            <p>Please retain this receipt for your records. Subject to terms of chit agreement.</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
};
