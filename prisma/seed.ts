import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🃏 Seeding poker-israel database...')

  // Create users
  const password = await bcrypt.hash('password123', 10)

  const david = await prisma.user.upsert({
    where: { email: 'david@example.com' },
    update: {},
    create: {
      email: 'david@example.com',
      password,
      name: 'דוד כהן',
      age: 32,
      city: 'תל אביב',
      skillLevel: 'PRO',
    },
  })

  const maya = await prisma.user.upsert({
    where: { email: 'maya@example.com' },
    update: {},
    create: {
      email: 'maya@example.com',
      password,
      name: 'מאיה לוי',
      age: 28,
      city: 'ירושלים',
      skillLevel: 'INTERMEDIATE',
    },
  })

  const avi = await prisma.user.upsert({
    where: { email: 'avi@example.com' },
    update: {},
    create: {
      email: 'avi@example.com',
      password,
      name: 'אבי ישראלי',
      age: 35,
      city: 'חיפה',
      skillLevel: 'INTERMEDIATE',
    },
  })

  const noa = await prisma.user.upsert({
    where: { email: 'noa@example.com' },
    update: {},
    create: {
      email: 'noa@example.com',
      password,
      name: 'נועה בן-דוד',
      age: 26,
      city: 'רמת גן',
      skillLevel: 'BEGINNER',
    },
  })

  // Create games
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(21, 0, 0, 0)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(20, 0, 0, 0)

  const nextFriday = new Date()
  const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7 || 7
  nextFriday.setDate(nextFriday.getDate() + daysUntilFriday)
  nextFriday.setHours(22, 0, 0, 0)

  const gameSeeds = [
    {
      hostId: david.id,
      title: 'קאש גיים אחלה ביתי',
      location: 'הבית שלי, רחוב דיזנגוף',
      city: 'תל אביב',
      dateTime: tomorrow,
      buyIn: 500,
      gameType: 'CASH',
      stakes: '2/5',
      houseFee: 0,
      maxPlayers: 9,
      currentPlayers: 3,
      notes: 'אווירה ביתית, שולחן מקצועי. מינימום 3 ביי-אין. אוכל ושתייה כלולים.',
      status: 'OPEN',
    },
    {
      hostId: maya.id,
      title: 'טורניר שישי בלילה - ירושלים',
      location: 'קלאב האחים, רחוב יפו 45',
      city: 'ירושלים',
      dateTime: nextFriday,
      buyIn: 200,
      gameType: 'TOURNAMENT',
      stakes: '1/1',
      houseFee: 20,
      maxPlayers: 30,
      currentPlayers: 12,
      notes: 'טורניר שבועי קבוע. מבנה: 20k נקודות, עלייה כל 20 דקות. כוס שתייה כלולה.',
      status: 'OPEN',
    },
    {
      hostId: avi.id,
      title: 'קאש גיים חיפה 1/2',
      location: 'מועדון הקלפים, רחוב הרצל',
      city: 'חיפה',
      dateTime: nextWeek,
      buyIn: 300,
      gameType: 'CASH',
      stakes: '1/2',
      houseFee: 15,
      maxPlayers: 8,
      currentPlayers: 2,
      notes: 'מגרש נחמד, שחקנים ברמה בינונית-גבוהה. כניסה מינימום 150₪.',
      status: 'OPEN',
    },
    {
      hostId: david.id,
      title: 'סיט אנד גו שבועי',
      location: 'מועדון פוקר TLV',
      city: 'תל אביב',
      dateTime: nextWeek,
      buyIn: 150,
      gameType: 'SIT_AND_GO',
      stakes: '0.5/1',
      houseFee: 10,
      maxPlayers: 6,
      currentPlayers: 6,
      notes: 'SNG מהיר, 6 שחקנים בלבד. מבנה מואץ.',
      status: 'FULL',
    },
    {
      hostId: noa.id,
      title: 'קאש למתחילים - רמת גן',
      location: 'בית פרטי, רמת גן',
      city: 'רמת גן',
      dateTime: nextFriday,
      buyIn: 100,
      gameType: 'CASH',
      stakes: '0.5/1',
      houseFee: 0,
      maxPlayers: 7,
      currentPlayers: 1,
      notes: 'מתאים למתחילים ובינוניים. אווירה נעימה ומלמדת. בא לתת לכולם הזדמנות ללמוד.',
      status: 'OPEN',
    },
  ]

  for (const game of gameSeeds) {
    await prisma.game.create({ data: game })
  }

  // Seed tournaments
  const t1Date = new Date()
  t1Date.setMonth(t1Date.getMonth() + 1)

  const t2Date = new Date()
  t2Date.setMonth(t2Date.getMonth() + 2)

  const t3Date = new Date()
  t3Date.setDate(t3Date.getDate() + 14)

  const t4Date = new Date()
  t4Date.setMonth(t4Date.getMonth() + 3)

  const tournamentSeeds = [
    {
      name: 'אליפות ישראל בפוקר 2026',
      location: 'מלון דן תל אביב',
      city: 'תל אביב',
      date: t1Date,
      website: 'https://example.com/israel-poker-championship',
      description: 'האירוע הגדול ביותר בפוקר הישראלי. פרס ראשון: 150,000₪',
      prizePool: '500,000₪',
      buyIn: 2200,
    },
    {
      name: 'WSOP Circuit Israel',
      location: 'קזינו אילת',
      city: 'אילת',
      date: t2Date,
      website: 'https://example.com/wsop-circuit-israel',
      description: "סבב ה-WSOP Circuit הרשמי בישראל. צ'מפ הסבב מקבל כרטיס ל-WSOP",
      prizePool: '1,000,000₪',
      buyIn: 5500,
    },
    {
      name: 'ים המלח פוקר פסטיבל',
      location: 'מלון לאונרדו, ים המלח',
      city: 'ים המלח',
      date: t3Date,
      website: 'https://example.com/dead-sea-poker-festival',
      description: 'פסטיבל פוקר 3 ימים עם מגוון אירועים. ניהול על ידי מקצוענים',
      prizePool: '200,000₪',
      buyIn: 1100,
    },
    {
      name: 'גביע הצפון - חיפה',
      location: 'מועדון הקלפים הגדול, חיפה',
      city: 'חיפה',
      date: t3Date,
      website: 'https://example.com/north-cup-haifa',
      description: 'טורניר החובבים הגדול של הצפון. פתוח לכל הרמות',
      prizePool: '50,000₪',
      buyIn: 330,
    },
    {
      name: 'אליפות ירושלים 2026',
      location: 'המלון הירושלמי',
      city: 'ירושלים',
      date: t4Date,
      website: 'https://example.com/jerusalem-championship',
      description: 'האליפות השנתית של ירושלים. טורניר מרובה ימים',
      prizePool: '120,000₪',
      buyIn: 1650,
    },
  ]

  for (const t of tournamentSeeds) {
    await prisma.tournament.create({ data: t })
  }

  console.log('✅ Seed completed!')
  console.log(`
Test accounts (all use password: password123):
  - david@example.com (פרו - תל אביב)
  - maya@example.com (בינוני - ירושלים)
  - avi@example.com (בינוני - חיפה)
  - noa@example.com (מתחיל - רמת גן)
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
