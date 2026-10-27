# Jenista Chits Mobile Application (React Native with Expo & TypeScript)

This is the mobile application conversion of the **Jenista Chits Management** platform. It communicates directly with the existing backend APIs and MongoDB database without altering any existing web application code.

---

## 📱 Traditional Sidebar (Drawer Navigation) & Modules

The mobile app implements a production-grade, traditional collapsible **Deep Navy Sidebar drawer** matching the web application's established visual identity:

### 1. Main Operations
- **Dashboard**: Live collection & member KPI cards, quick shortcuts
- **Customer Directory**: Full search, KYC status indicators (Active, Pending Approval, Inactive), active chit counts
- **Register Member**: New customer registration form with Camera & Photo picker and Aadhaar/PAN document uploads
- **Chit Groups & Plans**: Regular, Fixed, and Reverse Auction chit schemes catalog
- **Receipt Desk & Collections**: Issue receipts, auto-generate official vouchers, print and share PDF receipts via WhatsApp or Bluetooth

### 2. Finance & Ledger
- **General Ledger**: Immutable credits, debits, monthly installment logs, and prize disbursals
- **Payment Verifications**: Approve or reject customer-submitted UPI / Net Banking UTR receipts
- **Company Bank Accounts**: View, add, delete, and set default company bank accounts & UPI VPA handles

### 3. Reports & System
- **Non-Payers & Defaulters**: Real-time overdue listing with cumulative overdue sum and one-tap social sharing
- **Settings & Policies**: Organization profile (CIN, GSTIN, Foreman reg), KYC mandatory rules, and SMS/Email notification toggles

### 4. Staff & Field Agent Features
- Quick direct phone dialer (`tel:`)
- Automated WhatsApp reminder messages (`wa.me`)
- Today's cash collection tracker & EOD settlement counter

### 5. Customer Portal
- Real-time invested vs pending balance
- Dynamic 20-month installment pre-chart & schedule breakdown (`customerChitSchedule.ts`)
- Company banking & UPI payment details

---

## 🛠 Local Development & Testing

Navigate to the `mobile` directory:
```bash
cd mobile
```

### Run on Android Emulator or Device:
```bash
npm run android
```

### Start Expo Dev Server:
```bash
npm start
```

---

## 📦 Building Android APKs with EAS

The project includes pre-configured [eas.json](file:///d:/Chits/mobile/eas.json) and [app.json](file:///d:/Chits/mobile/app.json) with package name `com.jenista.chits`.

### 1. Build Development APK:
```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile development
```

### 2. Build Standalone Installable APK (Preview Profile):
```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

### 3. Build Production Android App Bundle (.aab):
```bash
cd mobile
npx eas-cli build --platform android --profile production
```
