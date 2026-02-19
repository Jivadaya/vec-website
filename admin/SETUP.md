# Admin Setup Guide

## 🚨 Problem: "Approval Pending" Screen
When you first sign up, your account is created with a **Pending** status. This is a security feature to prevent unauthorized access.

**You must manually approve your own account to become the First Super Admin.**

---

## ✅ Solution 1: The Easiest Way (No Code)

1.  **Go to Supabase**: Open [https://supabase.com/dashboard/project/_/editor](https://supabase.com/dashboard/project/_/editor) (or click your project used in `.env`).
2.  **Open Table Editor**: Click the **Table Editor** icon (looks like a spreadsheet grid) on the far left sidebar.
3.  **Select Table**: Click on the `profiles` table in the list.
4.  **Find Your User**: Look for the row with your email address.
    *   *If you don't see it, make sure you have actually signed up on the `admin/signup.html` page first.*
5.  **Edit Role**:
    *   Double-click the `role` cell (it currently says `pending`).
    *   Change it to `super_admin`.
    *   Click outside or press Enter to save.
6.  **Refresh Admin Panel**: Go back to your website `admin/index.html` and refresh. You should now be logged in!

---

## ✅ Solution 2: The "SQL" Way (Faster)

1.  **Go to Supabase**: Open your project dashboard.
2.  **Open SQL Editor**: Click the **SQL Editor** icon (looks like a terminal `>_`) on the left sidebar.
3.  **New Query**: Click "New Query" or open an empty scratchpad.
4.  **Paste & Run**: Copy the code below, replace the email, and click **Run**.

```sql
UPDATE profiles
SET role = 'super_admin', assigned_district = 'ALL'
WHERE email = 'YOUR_EMAIL@example.com';
```

---

## Next Steps (Once you are Super Admin)

1.  You will see a **"Manage Users"** button in the top navigation bar of the dashboard.
2.  When *other* people sign up, you can approve them directly from there!
