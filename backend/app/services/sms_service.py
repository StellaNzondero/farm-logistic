import logging
import os
import requests

logger = logging.getLogger(__name__)

def send_sms(to: str, body: str):
    """
    Sends an SMS message.
    If TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are set,
    it attempts to send via Twilio API. Otherwise, it just logs to console.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    
    print(f"Attempting to send SMS to {to} with body: {body}")
    print(f"Using Twilio SID: {account_sid}, Auth Token: {auth_token}, From Number: {from_number}")

    if account_sid and auth_token and from_number:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages"
            data = {
                "To": to,
                "From": from_number,
                "Body": body
            }
            response = requests.post(url, data=data, auth=(account_sid, auth_token))
            response.raise_for_status()
            logger.info(f"SMS sent successfully to {to} via Twilio")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS to {to} via Twilio: {e}")
            # Fallback to logging
    
    logger.info(f"LOGGING SMS (no provider) to {to}: {body}")
    print(f"\n[SMS SIMULATION] To: {to}\nBody: {body}\n")
    return True
