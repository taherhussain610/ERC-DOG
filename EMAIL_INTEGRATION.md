# Email Integration Guide

## Overview

AtlasX Crypto Exchange includes email notification functionality for all major user actions. Production delivery uses the MailRCLD SMTP service at `smtp-prod.mailrcld.com`.

## Configuration

### Environment Variables (.env)

```env
# Email Configuration
SMTP_HOST=smtp-prod.mailrcld.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-mailrcld-smtp-username
SMTP_PASSWORD=your-mailrcld-smtp-password
SMTP_FROM=your-verified-sender@your-domain.com
SMTP_FROM_NAME=AtlasX Crypto Exchange
ADMIN_EMAIL=your-admin@your-domain.com
SMTP_TRACK_OPENS=false
SMTP_TRACK_INBOX=true
SMTP_CAMPAIGN_ID=atlasx-transactional
```

### Required Setup

#### MailRCLD SMTP Setup

- Use the SMTP username and password issued by MailRCLD.
- Use a MailRCLD-verified sender address for `SMTP_FROM`.
- Keep port `587`, `SMTP_SECURE=false`, and `SMTP_REQUIRE_TLS=true` for STARTTLS.
- Configure MailRCLD tracking with `SMTP_TRACK_OPENS`, `SMTP_TRACK_INBOX`, and `SMTP_CAMPAIGN_ID`.
- Enter credentials only in `.env` or the production secret store. Never commit them.

#### Alternative SMTP Providers

- **SendGrid**: `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`
- **Mailgun**: `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`
- **AWS SES**: `SMTP_HOST=email-smtp.us-east-1.amazonaws.com`, `SMTP_PORT=587`

## Email Notifications

The system automatically sends emails for:

### 1. Welcome Email

- **Trigger**: New user registration
- **Recipient**: New user's email
- **Content**: Welcome message with account details

### 2. Deposit Confirmation

- **Trigger**: Successful wallet deposit
- **Recipient**: User's email
- **Content**: Deposit amount, currency, timestamp

### 3. Withdrawal Confirmation

- **Trigger**: Successful wallet withdrawal
- **Recipient**: User's email
- **Content**: Withdrawal amount, currency, destination address, timestamp

### 4. Trade Confirmation

- **Trigger**: Successful exchange/trade
- **Recipient**: User's email
- **Content**: From/To currencies, amounts, exchange rate, timestamp

### 5. Security Alerts

- **Trigger**: Important security events
- **Recipient**: User's email
- **Content**: Alert type, details, timestamp

### 6. Admin Notifications

- **Trigger**: System events requiring admin attention
- **Recipient**: Admin email (<ravindercloudtechnologyfz.llc@gmail.com>)
- **Content**: System event details

## Email Service API

### Check Email Status

```bash
GET /api/email/status
Authorization: Bearer <token>

Response:
{
  "email": {
    "enabled": false,
    "configured": true,
    "credentialsConfigured": false,
    "from": "your-verified-sender@your-domain.com",
    "fromName": "AtlasX Crypto Exchange",
    "adminEmail": "your-admin@your-domain.com",
    "host": "smtp-prod.mailrcld.com",
    "port": 587,
    "secure": false,
    "requireTls": true
  }
}
```

### Verify SMTP Connection

```bash
POST /api/email/verify
Authorization: Bearer <token>
```

### Send Test Email

```bash
POST /api/email/test
Authorization: Bearer <token>
```

The test message is always sent to the authenticated user's account email. The Setup Status panel exposes both actions without allowing arbitrary recipients.

## Testing Email Integration

### 1. Test Registration Email

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "your-test-recipient@example.com",
    "password": "password123"
  }'
```

### 2. Test Deposit Email

```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:4000/api/wallet/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "BTC",
    "amount": "0.1"
  }'
```

### 3. Test Trade Email

```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:4000/api/exchange \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromCurrency": "BTC",
    "toCurrency": "ETH",
    "amount": "0.01"
  }'
```

## Email Service Module

The email service is located at `src/services/emailService.js` and provides:

### Methods

- `sendEmail(options)` - Send generic email
- `sendWelcomeEmail(user)` - Send welcome email
- `sendDepositConfirmation(user, currency, amount)` - Send deposit confirmation
- `sendWithdrawalConfirmation(user, currency, amount, address)` - Send withdrawal confirmation
- `sendTradeConfirmation(user, from, to, fromAmount, toAmount, rate)` - Send trade confirmation
- `sendSecurityAlert(user, alertType, details)` - Send security alert
- `sendAdminNotification(subject, message)` - Send admin notification
- `getStatus()` - Get service status

## Production Considerations

### Email Password Security

- Never commit `.env` file with real passwords
- Use environment variables in production
- Rotate SMTP passwords regularly

### Rate Limiting

- Follow the sending limits assigned to the MailRCLD account.

### Email Deliverability

- Set up SPF, DKIM, and DMARC records
- Use a verified domain for better deliverability
- Monitor bounce rates and spam reports

### Error Handling

- Email failures are logged but don't block user operations
- All email sending is asynchronous
- Failed emails can be retried via admin notification

## Troubleshooting

### Email Not Sending

1. Check SMTP credentials in `.env`
2. Verify SMTP_PASSWORD is set
3. Check console logs for error messages
4. Test SMTP connection manually

### MailRCLD Specific Issues

1. Confirm `SMTP_USER` is the MailRCLD-issued SMTP login, not an unrelated mailbox login.
2. Confirm `SMTP_FROM` is verified for the MailRCLD account.
3. Keep STARTTLS enabled on port `587`.
4. Configure SPF, DKIM, and DMARC for the sending domain before production use.

An SMTP connection can authenticate successfully while delivery still fails with `554 invalid sender`. In that case, copy the exact approved sender email from the MailRCLD dashboard into `SMTP_FROM`; the SMTP username is not necessarily an approved sender identity.

### Testing Without Real Email

- Leave `SMTP_PASSWORD` empty
- Email service will log to console instead of sending
- Useful for development/testing

## Support

For email-related issues or questions, contact:

- **System Admin**: Use the address configured in `ADMIN_EMAIL`.
- **Technical Support**: Check server logs for detailed error messages
