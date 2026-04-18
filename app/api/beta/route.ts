import { NextRequest, NextResponse } from 'next/server'
import { betaSignupSchema } from '@/lib/validations'
import { sendBetaSignupNotification } from '@/lib/email'
import { sanitizeFormData } from '@/lib/sanitize'
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET || '',
        response: token,
      }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

// Per docs/architecture/14-SECURITY.md §Rate Limiting → Register: 5/min/IP
const RATE_LIMIT = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit('beta', ip, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)
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
    const validatedData = betaSignupSchema.safeParse(sanitizedData)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'invalid_data', details: validatedData.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, company, role } = validatedData.data
    const emailResult = await sendBetaSignupNotification({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company: company?.trim() || undefined,
      role: role || undefined,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'signup_failed', error_code: 'SIGNUP_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status: 'accepted',
      message: 'Signup recorded.',
    })
  } catch (error) {
    console.error('Beta signup error:', error)
    return NextResponse.json(
      { error: 'server_error', error_code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    count: null,
    spots_remaining: null,
    live_tracking: false,
  })
}
