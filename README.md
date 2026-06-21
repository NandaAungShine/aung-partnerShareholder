#  Aung Partner Shareholder Admin Dashboard

This is the comprehensive **Admin Dashboard Application** designed for managing shareholder activities, investments, dividends, and system settings. It acts as the central control unit for the Aung Partner platform, syncing seamlessly with the customer-facing mobile application.

---

##  Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS
- **Backend:** Node.js (Express)
- **Database:** MySQL
- **API:** RESTful API
- **Mobile Companion:** Flutter (For Client-side Mobile App)

---

##  Features & Workflow 

### 1. Authentication & Security
- **Secure Login:** Access the dashboard using preset admin credentials (Gmail & Password).
- **Admin Management:** Credentials can be safely updated anytime within the Account Settings.
- **Passcode Verification:** High-security actions (Level Updates, Trade Confirmations, Dividend Applications) strictly require a **Passcode** to execute.

### 2. Main Dashboard (Analytics & User Management)
- **Real-time Analytics:** Track critical metrics including *Total Shareholders, Rejected/Pending Accounts, Total Investment, Dividend Paid,* and *Total Shares*.
- **Time-filtered Data:** Filter analytical cards by Daily, Weekly, Monthly, or Yearly views.
- **Smart Data Table:** Sort and manage shareholder lists.
- **KYC Approval Workflow:** - Review and **Approve/Reject** pending accounts.
  - Once approved, users can log in via the Mobile App to update their Bank Info.
  - Admins can manually update shareholder levels (Level 1, 2, or 3) only *after* a share purchase is confirmed.

### 3. Trade & History Management
- **Live Account Status:** Only approved and verified accounts appear in this section.
- **Trading Operations:** Admins can manually execute **Buy** and **Sell** orders for shareholders (Authorized with Passcode).
- **Comprehensive History:** View structured transaction logs categorized by Buy, Sell, and Dividend payouts.
- **Asset Breakdown:** Top section cards display *Total Shares owned, Total Investment (Total Share Price + Total Interest),* and *Total Interest generated*.

### 4. Interest & Dividend Distribution
- **Targeted Payouts:** Search and select shareholders by unique ID (Only IDs with active shares are selectable).
- **Flexible Tracking:** Review past purchase history (Time, Quantity, and Rate) before distributing interest.
- **Custom Percentages:** Input custom dividend percentages (`%`) and click **Apply Dividend** (Authorized with Passcode) to push immediate balance updates to the customer's Mobile App.

### 5. Advanced Settings & CMS
- **Profile Configuration:** Update Admin personal information and login security details.
- **Content Management System (CMS):** Update active support channels visible on the Mobile App (Email, Viber, Telegram, and official Telegram Channels).
- **Policy Management:** Edit and update **Terms & Conditions** instantly for mobile users.

---

##  Getting Started 

Follow these steps to set up the admin dashboard on your local machine.

### Prerequisites
Make sure you have Node.js installed on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/aung-partner-admin-dashboard.git](https://github.com/your-username/aung-partner-admin-dashboard.git)
cd aung-partner-admin-dashboard

### Install Dependencies
npm install

### Run the Development Server
npm run dev

### Build for Production
Build for Production

Author

    Nanda Aung Shine - Frontend Developer(ui Design)

    GitHub: https://github.com/NandaAungShine

    LinkedIn: https://www.linkedin.com/in/n-4-nda-536375379?utm_source=share_via&utm_content=profile&utm_medium=member_ios

    Telegram: @hiitm