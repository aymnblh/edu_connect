import requests
import os
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
PLATFORM_SECRET = "educonnect-plat-sec-2026-v1"

def test_activation_flow():
    print("--- Starting Activation Flow Validation ---")
    
    # 1. Register a new school
    print("[1/4] Registering a new school...")
    reg_data = {
        "school_name": "Test Pilot School",
        "admin_full_name": "Directeur Test",
        "admin_email": f"admin_{os.urandom(4).hex()}@test.dz",
        "admin_password": "SecurePassword123!"
    }
    try:
        resp = requests.post(f"{BASE_URL}/onboarding/register-school", json=reg_data, timeout=10)
        if resp.status_code != 201:
            print(f"FAILED: Registration returned {resp.status_code}: {resp.text}")
            return
        
        school_id = resp.json()["school_id"]
        print(f"SUCCESS: School created with ID: {school_id}")

        # 2. Login to get token
        print("[2/4] Logging in to get access token...")
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": reg_data["admin_email"],
            "password": reg_data["admin_password"]
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Verify Inactive Status
        print("[3/4] Verifying 'school_inactive' block...")
        test_resp = requests.get(f"{BASE_URL}/admin/analytics/overview", headers=headers)
        if test_resp.status_code == 403 and "school_inactive" in test_resp.text:
            print("SUCCESS: Middleware correctly blocked access to analytics.")
        else:
            print(f"FAILED: Middleware did NOT block access (Status: {test_resp.status_code}).")

        # 4. Activate School
        print("[4/4] Activating school via Platform Secret...")
        act_resp = requests.patch(
            f"{BASE_URL}/platform/schools/{school_id}/activate",
            headers={"X-Platform-Secret": PLATFORM_SECRET}
        )
        if act_resp.status_code == 200:
            print("SUCCESS: School activated.")
        else:
            print(f"FAILED: Activation returned {act_resp.status_code}: {act_resp.text}")
            return

        # 5. Verify Active Status
        print("[5/5] Verifying access after activation...")
        final_resp = requests.get(f"{BASE_URL}/admin/analytics/overview", headers=headers)
        if final_resp.status_code == 200:
            print("SUCCESS: Analytics accessible after activation.")
        else:
            print(f"FAILED: Access still blocked (Status: {final_resp.status_code}).")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Is uvicorn running on port 8000?")

if __name__ == "__main__":
    test_activation_flow()
