# 🪙 Sphere Wishing Well — Complete Build Guide

## PROJECT SUMMARY
A community prediction board built on Unicity Sphere.
- Users connect their Sphere wallet
- Post a "wish" with a time limit (1h / 6h / 24h / 7d)
- Other users vote: ✅ Fulfil or ❌ Not Fulfil (costs 1 UCT per vote, goes P2P to wish creator)
- When timer expires: green card = wish fulfilled (more YES votes), red card = not fulfilled
- One wallet = one vote per wish. Cannot vote on your own wish.
- Two leaderboards: Most Wishes Created / Most Votes Cast

---

## ARCHITECTURE DIAGRAM

```
USER (Browser / Sphere iframe)
        │
        ▼
Next.js App (Vercel) ◄──── your app runs here
        │
        │ @unicitylabs/sphere-sdk/connect/browser
        │ autoConnect() → PostMessageTransport (iframe)
        │                  or ExtensionTransport (extension)
        ▼
Sphere Wallet (sphere.unicity.network)
        │
        │ sphere_getIdentity  → nametag + directAddress
        │ intent('send')      → real UCT P2P transfer
        │ transfer:incoming   → real-time events
        ▼
Unicity Testnet (L3 state transitions)

Data Storage: localStorage (no backend needed)
```

---

## MONEY FLOW — READ THIS CAREFULLY

```
CREATING A WISH:
  You → stake 1/5/10 UCT → YOUR OWN wallet
  (You send to yourself = skin in game, proves real wallet tx)

VOTING ON A WISH:
  Voter → 1 UCT → WISH CREATOR's directAddress
  (Pure P2P transfer. Happens the moment vote button clicked)
  (No escrow. No custody. No smart contract needed.)

EXPIRY RESOLUTION:
  - Date.now() > wish.expiresAt → status = 'fulfilled' or 'unfulfilled'
  - If fulfilCount >= noFulfilCount → GREEN = "Wish Fulfilled"
  - If noFulfilCount > fulfilCount → RED = "Wish Not Fulfilled"
  - This is UI-only. No automatic payouts. Money already moved at vote time.
```

---

## COMPLETE FOLDER STRUCTURE

```
sphere-wishing-well/
├── app/
│   ├── layout.tsx          ← Root layout
│   ├── page.tsx            ← Main page (home feed)
│   └── globals.css         ← Tailwind + fonts
├── components/
│   ├── Header.tsx          ← Wallet connect button + stats
│   ├── WishCard.tsx        ← Single wish + vote buttons
│   ├── CreateWishModal.tsx ← Modal to create wish
│   ├── CountdownTimer.tsx  ← Live countdown per card
│   └── Leaderboard.tsx     ← Two tabs: creators / voters
├── hooks/
│   ├── useSphereWallet.ts  ← Wallet connect state
│   ├── useWishes.ts        ← All wish CRUD + voting
│   └── useLeaderboard.ts   ← Derived leaderboard data
├── lib/
│   ├── sphere.ts           ← autoConnect wrapper
│   ├── storage.ts          ← localStorage helpers
│   └── constants.ts        ← UCT decimals, durations
├── types/
│   └── wish.ts             ← TypeScript interfaces
├── public/
│   └── icon.png            ← 128x128 app icon (add your own)
├── package.json
├── next.config.js          ← iframe headers for Sphere
├── vercel.json             ← Same iframe headers on Vercel
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── .gitignore
```

---

## STEP-BY-STEP: SET UP AND RUN LOCALLY

### Prerequisites
- Node.js 18+ installed
- VS Code installed
- Git installed
- GitHub account
- Vercel account (free)

### Step 1 — Create project folder
```bash
mkdir sphere-wishing-well
cd sphere-wishing-well
```

### Step 2 — Copy all files
Copy every file from this project into the correct folders exactly as shown above.

### Step 3 — Install dependencies
```bash
npm install
```

### Step 4 — Run locally
```bash
npm run dev
```
Open http://localhost:3000

### Step 5 — Test inside Sphere
In your browser, go to:
```
https://sphere.unicity.network/agents/custom?url=http%3A%2F%2Flocalhost%3A3000
```
This loads your local app inside the Sphere desktop. The wallet connect will work here.

---

## STEP-BY-STEP: DEPLOY TO VERCEL

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Sphere Wishing Well"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sphere-wishing-well.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repo `sphere-wishing-well`
4. Framework: Next.js (auto-detected)
5. Click Deploy
6. Your URL: `https://sphere-wishing-well.vercel.app`

### Step 3 — Test on live Sphere
Go to:
```
https://sphere.unicity.network/agents/custom?url=https%3A%2F%2Fsphere-wishing-well.vercel.app
```

---

## STEP-BY-STEP: SUBMIT TO SPHERE APP DIRECTORY

### Step 1 — Fork the sphere-apps repo
Go to: https://github.com/unicity-sphere/sphere-apps
Click Fork → Fork to your GitHub account

### Step 2 — Edit apps.json
In your fork, open `apps.json` and add this entry inside the `"apps"` array
(keep alphabetical order by category, then name):

```json
{
  "category": "social",
  "name": "Wishing Well",
  "description": "Cast wishes, let the community vote with UCT. Fulfilled or not — the chain decides.",
  "url": "https://sphere-wishing-well.vercel.app",
  "icon": "https://sphere-wishing-well.vercel.app/icon.png"
}
```

### Step 3 — Open Pull Request
- Go to your fork
- Click "Contribute" → "Open pull request"
- Title: `Add Wishing Well — social prediction board with UCT voting`
- Description:
```
## Wishing Well

First social prediction app on Sphere with real UCT wallet integration.

**What it does:**
- Users cast wishes with a time limit (1h/6h/24h/7d)
- Community votes ✅ Fulfil or ❌ Not Fulfil (1 UCT per vote, P2P to wish creator)
- One wallet = one vote per wish
- When time expires: green (fulfilled) or red (not fulfilled) resolution
- Two leaderboards: top wishers + top voters
- Real-time incoming transfer events

**Wallet integration:**
- autoConnect via @unicitylabs/sphere-sdk/connect/browser
- sphere_getIdentity for @nametag display
- intent('send') for UCT transfers
- transfer:incoming for real-time updates

**Tech:** Next.js 14, TypeScript, Tailwind CSS, deployed on Vercel
**Category:** social (first real social app with token mechanics)
```

---

## HOW THE TEAM KNOWS IT'S YOU

1. Your GitHub username is on the PR
2. Every wish you create shows `@YOUR_NAMETAG` on the card — baked into the app
3. Your wallet's `directAddress` is stored with every wish you create and vote on
4. When the team opens the app and connects their wallet, they see your `@beastboy` wishes already there
5. The wallet integration is verified — they can see real UCT transfers on testnet

---

## WALLET INTEGRATION — KEY CODE EXPLAINED

### Connect (lib/sphere.ts)
```typescript
import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';

const result = await autoConnect({
  dapp: { name: 'Sphere Wishing Well', url: location.origin },
  walletUrl: 'https://sphere.unicity.network',
  silent: false,  // false = show approval popup if not yet approved
});

const identity = await result.client.query('sphere_getIdentity');
// identity.nametag      → "@beastboy"
// identity.directAddress → "DIRECT://0000be36..."
```

### Send UCT (lib/sphere.ts)
```typescript
await client.intent('send', {
  recipient: recipientDirectAddress,  // "DIRECT://..."
  amount: '1000000000000000000',       // 1 UCT = 10^18 smallest units
  coinId: 'UCT',
});
```

### Why X-Frame headers matter (next.config.js + vercel.json)
Sphere loads your app in an iframe. Without these headers,
the browser blocks the iframe and nothing works.
Both files set: `frame-ancestors 'self' https://sphere.unicity.network`

---

## COMMON ERRORS AND FIXES

**"autoConnect is not a function"**
→ Make sure you're importing from `@unicitylabs/sphere-sdk/connect/browser`
→ Not from `@unicitylabs/sphere-sdk` directly

**"Wallet not connecting inside Sphere"**
→ Check vercel.json headers are deployed
→ Test via: sphere.unicity.network/agents/custom?url=YOUR_VERCEL_URL

**"Cannot vote on own wish" error**
→ This is correct behavior. Creator cannot vote on their own wish.

**"Already voted" error**
→ One wallet address = one vote per wish. This is enforced in useWishes.ts

**UCT amount looks wrong**
→ 1 UCT = `1_000_000_000_000_000_000n` (18 decimal places)
→ In lib/sphere.ts: `BigInt(amountUCT) * BigInt('1000000000000000000')`

---

## WHAT TO TELL CHATGPT

Paste this entire README plus all the code files and say:

"I have a Next.js project called sphere-wishing-well. All the files are provided above.
Help me:
1. Set up the project in VS Code
2. Run it locally with npm run dev
3. Fix any TypeScript or import errors
4. Deploy to Vercel
5. Test it inside the Sphere desktop at sphere.unicity.network

The wallet integration uses @unicitylabs/sphere-sdk/connect/browser.
Do not change the wallet integration code — it must use autoConnect and intent('send').
The app must work inside an iframe on sphere.unicity.network."

---

## LINKS USED TO BUILD THIS

- Sphere Apps repo: https://github.com/unicity-sphere/sphere-apps
- Sphere SDK: https://github.com/unicity-sphere/sphere-sdk
- Connect docs: https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md
- Sphere desktop: https://sphere.unicity.network
- Testnet faucet: https://faucet.unicity.network/faucet/
- SDK npm: https://www.npmjs.com/package/@unicitylabs/state-transition-sdk
