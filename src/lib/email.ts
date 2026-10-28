import nodemailer from 'nodemailer'

interface MeetingEmailDetails {
  title: string
  description?: string | null
  scheduled_at: string
  venue?: string | null
  id: string
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendMeetingInviteEmail(
  recipients: string[],
  meeting: MeetingEmailDetails
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 }
  }

  const origin = process.env.SITE_URL || 'https://photohub.bitsathy.ac.in'
  const meetingUrl = `${origin}/meetings`
  const formattedDate = new Date(meeting.scheduled_at).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const fromEmail = process.env.SMTP_FROM || '"PhotoHub Bitsathy" <photohub@bitsathy.ac.in>'

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Meeting Invitation: ${meeting.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E5E5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #121212; border-radius: 18px; border: 1px solid #262626; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px; background: linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(20,184,166,0.05) 100%); border-bottom: 1px solid #262626;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.3); font-size: 11px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.05em;">
                      Official Meeting Invitation
                    </span>
                    <h1 style="margin: 12px 0 4px 0; font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                      ${meeting.title}
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #A3A3A3;">
                      PhotoHub • Bannari Amman Institute of Technology
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px;">
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #D4D4D4;">
                You have been invited to an upcoming <strong>PhotoHub Private Session</strong>. Please review the schedule and agenda details below:
              </p>

              <!-- Meeting Details Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #171717; border: 1px solid #2A2A2A; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #2A2A2A;">
                    <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; display: block; margin-bottom: 4px;">Date & Time</span>
                    <span style="font-size: 14px; font-weight: 600; color: #22D3EE;">${formattedDate}</span>
                  </td>
                </tr>
                ${meeting.venue ? `
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #2A2A2A;">
                    <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; display: block; margin-bottom: 4px;">Venue / Location</span>
                    <span style="font-size: 14px; font-weight: 500; color: #F5F5F5;">${meeting.venue}</span>
                  </td>
                </tr>
                ` : ''}
                ${meeting.description ? `
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; display: block; margin-bottom: 4px;">Agenda / Summary</span>
                    <span style="font-size: 13px; font-weight: 400; color: #D4D4D4; line-height: 1.5; white-space: pre-wrap;">${meeting.description}</span>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${meetingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: #06B6D4; color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(6,182,212,0.3);">
                      Open PhotoHub Meetings & Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0E0E0E; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #737373;">
                This automated invite was generated from <strong>photohub@bitsathy.ac.in</strong> for registered club members.
              </p>
              <p style="margin: 0; font-size: 11px; color: #525252;">
                PhotoHub • Photography & Media Club • Bannari Amman Institute of Technology
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const transporter = getSmtpTransporter()

  if (!transporter) {
    console.log(`[PhotoHub Email] SMTP credentials not set in .env. Logged invite email for ${recipients.length} members to meeting "${meeting.title}":`, recipients)
    return { success: true, count: recipients.length }
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipients.join(', '),
      subject: `[PhotoHub] Meeting Invitation: ${meeting.title} (${formattedDate})`,
      html: htmlContent,
    })

    console.log(`[PhotoHub Email] Successfully sent automated invite emails to ${recipients.length} members. MessageId:`, info.messageId)
    return { success: true, count: recipients.length }
  } catch (err: any) {
    console.error('[PhotoHub Email] Error sending meeting invite emails via SMTP:', err?.message || err)
    return { success: false, count: 0, error: err?.message || 'Failed to send invite email' }
  }
}
