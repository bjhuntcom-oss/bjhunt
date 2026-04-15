import { NextRequest, NextResponse } from 'next/server'
import { betaSignupSchema } from '@/lib/validations'
import { sendBetaSignupNotification } from '@/lib/email'
import { sanitizeFormData } from '@/lib/sanitize'

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

const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT = 5
const RATE_LIMIT_WINDOW = 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', error_code: 'RATE_LIMITED' },
        { status: 429 }
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
