import nodemailer from "nodemailer"

type Mail = { to: string; subject: string; text: string; html: string }

// SMTP settings come from the environment (works with Gmail app passwords,
// Brevo, Resend SMTP, etc.). Without them, emails are logged to the server
// console instead so flows like password reset can still be tested locally.
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 465,
        secure: (Number(SMTP_PORT) || 465) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null

export async function sendMail(mail: Mail) {
  if (!transporter) {
    console.log(`[email] SMTP not configured; would send to ${mail.to}: ${mail.subject}\n${mail.text}`)
    return
  }
  await transporter.sendMail({ from: EMAIL_FROM || SMTP_USER, ...mail })
}
