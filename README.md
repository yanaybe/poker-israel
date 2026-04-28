# ♠ פוקר ישראל

פלטפורמת קהילת פוקר ישראלית — מצא משחקים, פרסם גיימס, הצטרף לטורנירים.

## טכנולוגיות

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** TailwindCSS (RTL + Hebrew theme)
- **Auth:** NextAuth.js (JWT + Credentials)
- **Database:** Prisma ORM + SQLite (local) / PostgreSQL (production)
- **Forms:** React Hook Form + Zod validation

## הרצה מקומית

### 1. התקנת תלויות

```bash
cd poker-israel
npm install
```

### 2. הגדרת משתני סביבה

```bash
cp .env.example .env
```

ערוך את `.env` ושנה את `NEXTAUTH_SECRET` לערך אקראי:

```bash
openssl rand -base64 32
```

### 3. יצירת ה-database

```bash
npm run db:push
```

### 4. (אופציונלי) הוספת נתוני דמו

```bash
npm run db:seed
```

זה יצור 4 משתמשים ו-5 משחקים לדוגמה.

**חשבונות דמו (כולם עם סיסמה: `password123`):**
- `david@example.com` — דוד כהן (פרו, ת"א)
- `maya@example.com` — מאיה לוי (בינוני, ירושלים)
- `avi@example.com` — אבי ישראלי (בינוני, חיפה)
- `noa@example.com` — נועה בן-דוד (מתחיל, רמת גן)

### 5. הפעלת השרת

```bash
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000)

---

## מבנה הפרויקט

```
poker-israel/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Sample data
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login / Register pages
│   │   ├── (main)/         # Main app pages (games, profile, messages, tournaments)
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Global styles + poker theme
│   │   └── layout.tsx      # Root layout (RTL + fonts)
│   ├── components/
│   │   ├── games/          # GameCard, GameFilters
│   │   ├── layout/         # Navbar, Footer
│   │   ├── providers/      # SessionProvider
│   │   └── ui/             # Button, Input, Badge, Modal, etc.
│   ├── lib/
│   │   ├── auth.ts         # NextAuth config
│   │   ├── db.ts           # Prisma client singleton
│   │   └── utils.ts        # Helper functions
│   ├── middleware.ts        # Auth route protection
│   └── types/
│       └── index.ts        # Shared TypeScript types + Hebrew labels
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| GET | `/api/games` | List games (filterable) |
| POST | `/api/games` | Create game (auth) |
| GET | `/api/games/:id` | Game details |
| POST | `/api/games/:id/join` | Request to join (auth) |
| PATCH | `/api/games/:id/requests/:reqId` | Approve/reject request (host) |
| GET | `/api/messages` | List conversations (auth) |
| GET | `/api/messages/:userId` | Get chat (auth) |
| POST | `/api/messages/:userId` | Send message (auth) |
| GET | `/api/users/:id` | User profile |
| PATCH | `/api/users/me` | Update profile (auth) |
| GET | `/api/tournaments` | List tournaments |
| GET | `/api/notifications` | Notification counts (auth) |

## מעבר ל-PostgreSQL (Production)

1. שנה ב-`prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. עדכן `DATABASE_URL` ב-`.env` לחיבור PostgreSQL
3. הרץ `npm run db:push`

## פיצ'רים עיקריים

- ✅ הרשמה/התחברות עם JWT
- ✅ פרופיל משתמש עם עריכה
- ✅ רשימת משחקים עם פילטרים (עיר, סוג, עיוורים, סטטוס)
- ✅ יצירת משחק עם ולידציה
- ✅ דף פרטי משחק מלא
- ✅ מערכת בקשות הצטרפות (בקש → אשר/דחה)
- ✅ מסרים ישירים בין משתמשים (polling כל 3 שניות)
- ✅ דף טורנירים עם קישורים חיצוניים
- ✅ התראות (בקשות ממתינות + הודעות שלא נקראו)
- ✅ עיצוב פוקר כהה + RTL עברית
- ✅ Responsive לניידים
