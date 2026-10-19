"""Offline tests for the parser and the message builder. Run: python3 test_speed_to_lead.py"""
import sys, os
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import speed_to_lead as s

SIGNON = """You have a new lead from your Luxury Presence website.

You've received a new lead
calebjackson.org ( http://linktracking.luxurypresence.com/ls/click?upn=abc )

BB

Boubkeur Barakate

boubkeur1@gmail.com

Overview
Type
Google Sign On
Source
 http://linktracking.luxurypresence.com/ls/click?upn=def
Message

Time Frame

Contact Information
Email address
boubkeur1@gmail.com
From website
Phone number
 ( tel: )
From website
See complete profile ( http://linktracking.luxurypresence.com/x )
"""
VALUATION = (SIGNON.replace("Boubkeur Barakate", "Chris Ogle").replace("boubkeur1@gmail.com", "hemiengine500@icloud.com")
             .replace("Google Sign On", "Home Valuation").replace("Phone number\n ( tel: )", "Phone number\n (225) 555-0199 ( tel:2255550199 )"))

l = s.parse_lead(SIGNON, "⭐️ New Lead - Boubkeur Barakate")
assert l == {"name": "Boubkeur Barakate", "first": "Boubkeur", "email": "boubkeur1@gmail.com", "phone": "", "type": "Google Sign On"}, l
m = s.build_messages(l, datetime(2026, 10, 18, 8, 34))
assert m["text"] is None and "signed in" in m["email"] and "call" not in m["email"].lower(), m
assert "stop" in m["email"]

l2 = s.parse_lead(VALUATION, "⭐️ New Lead - Chris Ogle")
assert l2["phone"] == "2255550199" and l2["type"] == "Home Valuation" and l2["first"] == "Chris", l2
day = s.build_messages(l2, datetime(2026, 10, 11, 14, 0))
assert day["text"] and len(day["text"]) <= 160 and "in the next few minutes" in day["email"], day
night = s.build_messages(l2, datetime(2026, 10, 11, 21, 50))
assert night["text"] is None and "first thing in the morning" in night["email"], night
assert "Keller Williams First Choice" in day["email"] and "STOP" in day["text"]
assert s.quiet_hours(datetime(2026, 1, 1, 7, 59)) and not s.quiet_hours(datetime(2026, 1, 1, 8, 0)) and s.quiet_hours(datetime(2026, 1, 1, 20, 0))
assert not s.LIVE, "LIVE must be off unless LIVE=1 is set"
print("all tests pass")
print("--- daytime email ---\n" + day["email"])
print("--- daytime text ---\n" + day["text"], len(day["text"]), "chars")
