import subprocess
import time
import os
import requests
import signal

# Configuration
BASE_URL = "http://127.0.0.1:8000"
PLATFORM_SECRET = "educonnect-plat-sec-2026-v1"

def run_test_and_server():
    print("--- Integrated Activation Flow Validation ---")
    
    # 1. Start Server
    print("[0/4] Starting server in background...")
    env = os.environ.copy()
    # Ensure project root is in PYTHONPATH
    env["PYTHONPATH"] = os.getcwd()
    
    process = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env
    )
    
    # Wait for server to be ready
    time.sleep(15)
    
    try:
        # 2. Register a new school
        print("[1/4] Registering a new school...")
        reg_data = {
            "school_name": "Test Pilot School",
            "admin_full_name": "Directeur Test",
            "admin_email": f"admin_{os.urandom(4).hex()}@test.dz",
            "admin_password": "SecurePassword123!"
        }
        resp = requests.post(f"{BASE_URL}/onboarding/register-school", json=reg_data, timeout=15)
        if resp.status_code != 201:
            print(f"FAILED: Registration returned {resp.status_code}: {resp.text}")
            return
        
        school_id = resp.json()["school_id"]
        print(f"SUCCESS: School created with ID: {school_id}")

        # 3. Login to get token
        print("[2/4] Logging in to get access token...")
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": reg_data["admin_email"],
            "password": reg_data["admin_password"]
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Verify Inactive Status (Should get 403 school_inactive)
        print("[3/4] Verifying 'school_inactive' block via Middleware...")
        # Access a protected route: /admin/analytics/overview
        test_resp = requests.get(f"{BASE_URL}/admin/analytics/overview", headers=headers)
        if test_resp.status_code == 403 and "school_inactive" in test_resp.text:
            print("SUCCESS: Middleware correctly blocked access to analytics for inactive school.")
        else:
            print(f"FAILED: Middleware did NOT block access (Status: {test_resp.status_code}).")
            # print(f"Response: {test_resp.text}")

        # 5. Activate School
        print("[4/4] Activating school via Platform Secret...")
        act_resp = requests.patch(
            f"{BASE_URL}/platform/schools/{school_id}/activate",
            headers={"X-Platform-Secret": PLATFORM_SECRET}
        )
        if act_resp.status_code == 200:
            print("SUCCESS: School activated via Platform API.")
        else:
            print(f"FAILED: Activation returned {act_resp.status_code}: {act_resp.text}")
            return

        # 6. Verify Active Status
        print("[5/5] Final Verification: Analytics access...")
        final_resp = requests.get(f"{BASE_URL}/admin/analytics/overview", headers=headers)
        if final_resp.status_code == 200:
            print("SUCCESS: Analytics accessible. Flow fully validated.")
        else:
            print(f"FAILED: Access still blocked after activation (Status: {final_resp.status_code}).")

    except Exception as e:
        print(f"ERROR: {e}")
        # Print server output in case of error
        out, err = process.communicate(timeout=1)
        print("--- Server Output ---")
        print(out.decode())
        print(err.decode())
    finally:
        # Stop Server
        print("Stopping server...")
        # On windows, use taskkill or Terminate
        process.terminate()

if __name__ == "__main__":
    run_test_and_server()
