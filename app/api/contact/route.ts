import { NextRequest, NextResponse } from 'next/server'
import { contactFormSchema } from '@/lib/validations'
import { sendContactFormNotification } from '@/lib/email'
import { sanitizeFormData } from '@/lib/sanitize'
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET
  if (!secret) {
    console.error('[captcha] HCAPTCHA_SECRET is not set — refusing all submissions')
    return false
  }
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

// Per docs/architecture/14-SECURITY.md §Rate Limiting → Password reset: 3/min/IP
// Same threshold applied to public contact form to match the spec's spirit.
const RATE_LIMIT = 3
const RATE_LIMIT_WINDOW_MS = 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit('contact', ip, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', error_code: 'RATE_LIMITED' },
        { status: 429, headers: rateLimitHeaders(rl) },
      )
    }

    const body = await request.json()
    const { captchaToken, ...formData } = body

    if (!captchaToken || !(await verifyCaptcha(captchaToken))) {
      return NextResponse.json(
        { error: 'invalid_captcha', error_code: 'CAPTCHA_INVALID' },
        { status: 400 }
      )
    }

    const sanitizedData = sanitizeFormData(formData)
    const validatedData = contactFormSchema.safeParse(sanitizedData)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'invalid_data', details: validatedData.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, company, subject, message } = validatedData.data

    const emailResult = await sendContactFormNotification({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company: company?.trim() || undefined,
      subject,
      message: message.trim(),
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'send_failed', error_code: 'SEND_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status: 'accepted',
      message: 'Message sent successfully.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'server_error', error_code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
