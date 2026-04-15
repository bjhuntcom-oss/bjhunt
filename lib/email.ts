import { Resend } from 'resend'

const FROM_EMAIL = 'BJHUNT <noreply@bjhunt.com>'
const TEAM_EMAIL = 'bjhuntcom@gmail.com'

/** Escape HTML entities to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured - emails will not be sent')
    return null
  }
  return new Resend(apiKey)
}

export async function sendBetaSignupNotification(data: {
  name: string
  email: string
  company?: string
  role?: string
}) {
  const resend = getResendClient()
  if (!resend) return { success: false, error: 'Email not configured' }
  
  try {
    // Email to team
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEAM_EMAIL,
      subject: `🚀 Nouvelle inscription Beta: ${escapeHtml(data.name)}`,
      html: `
        <h2>Nouvelle inscription au programme Beta</h2>
        <p><strong>Nom:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Entreprise:</strong> ${escapeHtml(data.company || 'Non spécifié')}</p>
        <p><strong>Rôle:</strong> ${escapeHtml(data.role || 'Non spécifié')}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
      `,
    })

    // Confirmation email to user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Bienvenue dans le programme Beta BJHUNT! 🎉',
      html: `
        <h2>Bonjour ${escapeHtml(data.name)},</h2>
        <p>Merci de rejoindre le programme Beta de BJHUNT!</p>
        <p>Votre inscription a bien été enregistrée. Nous vous contacterons sous 48-72h avec vos accès.</p>
        <h3>Prochaines étapes:</h3>
        <ul>
          <li>Vous recevrez un email avec vos identifiants de connexion</li>
          <li>Accès au canal Slack privé avec l'équipe</li>
          <li>6 mois gratuits au plan Pro</li>
        </ul>
        <p>À très bientôt!</p>
        <p><strong>L'équipe BJHUNT</strong></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Questions? Répondez directement à cet email ou contactez-nous à beta@bjhunt.com
        </p>
      `,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending beta signup emails:', error)
    return { success: false, error }
  }
}

export async function sendContactFormNotification(data: {
  name: string
  email: string
  company?: string
  subject: string
  message: string
}) {
  const resend = getResendClient()
  if (!resend) return { success: false, error: 'Email not configured' }
  
  try {
    // Email to team
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEAM_EMAIL,
      subject: `📩 Contact: ${escapeHtml(data.subject)}`,
      replyTo: data.email,
      html: `
        <h2>Nouveau message de contact</h2>
        <p><strong>De:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
        <p><strong>Entreprise:</strong> ${escapeHtml(data.company || 'Non spécifié')}</p>
        <p><strong>Sujet:</strong> ${escapeHtml(data.subject)}</p>
        <hr>
        <h3>Message:</h3>
        <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
        <hr>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><em>Répondez directement à cet email pour contacter ${escapeHtml(data.name)}</em></p>
      `,
    })

    // Confirmation email to user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Nous avons bien reçu votre message - BJHUNT',
      html: `
        <h2>Bonjour ${escapeHtml(data.name)},</h2>
        <p>Merci de nous avoir contactés!</p>
        <p>Nous avons bien reçu votre message concernant "<strong>${escapeHtml(data.subject)}</strong>" et nous vous répondrons dans les plus brefs délais.</p>
        <h3>Récapitulatif de votre message:</h3>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 15px; color: #666;">
          ${escapeHtml(data.message).replace(/\n/g, '<br>')}
        </blockquote>
        <p>À très bientôt!</p>
        <p><strong>L'équipe BJHUNT</strong></p>
      `,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending contact form emails:', error)
    return { success: false, error }
  }
}
