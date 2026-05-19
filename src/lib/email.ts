// Email sending utility. Works in two modes:
// 1. If RESEND_API_KEY is set: sends real emails via Resend
// 2. If not set: logs the email to the console (dev/CI mode)
//
// To enable real email sending:
//   npm install resend
//   Set RESEND_API_KEY and EMAIL_FROM in .env

import { logger } from './logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@pokerisrael.com'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    logger.info(
      { to: payload.to, subject: payload.subject, body: payload.html.replace(/<[^>]+>/g, '') },
      'EMAIL (no RESEND_API_KEY — dev mode)'
    )
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: 'איפוס סיסמה — פוקר ישראל',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #c9a84c;">פוקר ישראל ♠</h2>
        <h3>איפוס סיסמה</h3>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה כדי לאפס אותה:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #c9a84c; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            אפס סיסמה
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">
          הקישור בתוקף ל-60 דקות בלבד.<br>
          אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.
        </p>
        <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
        <p style="color: #888; font-size: 12px;">
          קישור ישיר: <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const gamesUrl = `${APP_URL}/games`
  await sendEmail({
    to: email,
    subject: 'ברוך הבא לפוקר ישראל ♠',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #c9a84c;">פוקר ישראל ♠</h2>
        <h3>ברוך הבא, ${name}!</h3>
        <p>נרשמת בהצלחה לפוקר ישראל — הפלטפורמה הגדולה ביותר למשחקי פוקר ביתיים בישראל.</p>
        <p style="margin: 24px 0;">
          <a href="${gamesUrl}"
             style="background: #c9a84c; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            מצא משחק קרוב אליך
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">בהצלחה ליד השולחן!</p>
      </div>
    `,
  })
}
