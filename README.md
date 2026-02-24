This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Release Notes

### 2026-02-24 — UI Light/Dark Mode

- Added global light/dark theme support with persistent preference (`localStorage`).
- Added floating theme toggle button available across app pages.
- Applied dark-mode contrast refinements for key pages and components:
	- Dashboard, Budget, Transactions, Profile, Login, Register, Auth Code, Stats
	- Charts, alerts, modals, forms, headers, and bottom navigation
- Updated global styling (`globals.css`) and class-based dark mode configuration.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Email Auth Code Setup (Google Sign-in)

Untuk fitur kode otentikasi user baru (kode dikirim ke Gmail), tambahkan env berikut di file `.env.local`:

```bash
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

Template EmailJS minimal perlu menerima parameter:
- `to_email`
- `otp_code`
- `app_name`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Export / Reporting: Firestore → Google Sheets

You can export a user's transactions to a Google Sheet using a service account.

1. Create a Google Service Account with `Sheets API` and `Drive` access and download the JSON key file.
2. Share the target Google Sheet with the service account email (so it can edit).
3. Run the script locally:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
node scripts/export-to-sheets.js --userUid=<USER_UID> --sheetId=<SHEET_ID>
```

The script will write a styled table (`Sheet1`) with columns: Tanggal, Tipe, Kategori, Jumlah, Catatan, Deskripsi, Icon.

If you want automated syncs, run the script in a scheduled runner (Cloud Run, Cloud Functions, GitHub Actions) with credentials stored securely.
