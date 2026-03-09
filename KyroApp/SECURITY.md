# Kyro Security Practices

_Last updated: 2025_

## 1. General

- All connections use HTTPS
- Passwords are not stored (username-only auth, GitHub OAuth)
- Session tokens are HttpOnly cookies

## 2. User Data

- Auth data stored securely in Supabase
- Payment info is **never handled by Kyro**
- File uploads scanned before going live

## 3. Reporting Vulnerabilities

Email: security@kyro.dev

Please provide steps to reproduce. Do not exploit vulnerabilities.

## 4. Protections

- API routes use server-side session validation
- CSRF protection on OAuth flows via state parameter
- Rate limiting recommended via Vercel Edge Config

## 5. Recommendations for Users

- Use a strong GitHub password and enable 2FA
- Verify external payment links before purchasing
- Report suspicious stores or products using the report button
