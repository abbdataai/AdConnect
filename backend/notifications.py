"""
Notification stubs — WhatsApp & Email.

In production, replace these with real integrations:
  • WhatsApp: Twilio API or Meta Cloud API
  • Email: SMTP (smtplib) or SendGrid/SES

For now we just print + log to a file so you can see them firing.
"""
import os, json, time
from datetime import datetime

LOG_PATH = os.getenv("NOTIF_LOG", "notifications.log")

def _log(channel: str, payload: dict):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {channel.upper()}  {json.dumps(payload, ensure_ascii=False)}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def send_whatsapp(to: str, message: str, when: int | None = None):
    """
    Send a WhatsApp message. If `when` is a future unix timestamp, this would
    enqueue it via a real scheduler (Celery/APScheduler). Here we just log it.

    Twilio reference:
        from twilio.rest import Client
        client = Client(SID, TOKEN)
        client.messages.create(from_='whatsapp:+1...', to=f'whatsapp:{to}', body=message)
    """
    _log("whatsapp", {"to": to, "message": message,
                      "scheduled_for": when, "delay_s": (when - int(time.time())) if when else 0})
    return {"queued": True}

def send_email(to: str | None = None, group: str | None = None,
               subject: str = "", body: str = ""):
    """
    Send an email — either to a single address or to a saved group (resolved
    server-side from notif_groups).

    SMTP reference:
        import smtplib, ssl
        from email.message import EmailMessage
        msg = EmailMessage(); msg['Subject']=subject; msg['From']='no-reply@mktwifi.com'
        msg['To']=to; msg.set_content(body)
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context()) as s:
            s.login(USER, PASS); s.send_message(msg)
    """
    _log("email", {"to": to, "group": group, "subject": subject, "body": body})
    return {"queued": True}
