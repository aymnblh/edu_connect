import sys
import os
import argparse
import asyncio
import getpass
import re
import uuid
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_keys(output_dir: str):
    """Generate RS256 private and public keys."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    private_path = os.path.join(output_dir, "private_key.pem")
    public_path = os.path.join(output_dir, "public_key.pem")

    if os.path.exists(private_path) or os.path.exists(public_path):
        print(f"Error: Keys already exist in {output_dir}. Delete them first if you want to regenerate.")
        sys.exit(1)

    print(f"Generating RS256 keys in {output_dir}...")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )

    # Serialize private key
    with open(private_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

    # Serialize public key
    public_key = private_key.public_key()
    with open(public_path, "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))

    print("Success: RS256 keys generated.")


def validate_admin_password(password: str, email: str) -> list[str]:
    failures: list[str] = []
    if len(password) < 14:
        failures.append("password must contain at least 14 characters")
    if not re.search(r"[a-z]", password):
        failures.append("password must contain a lowercase letter")
    if not re.search(r"[A-Z]", password):
        failures.append("password must contain an uppercase letter")
    if not re.search(r"[0-9]", password):
        failures.append("password must contain a digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        failures.append("password must contain a symbol")
    local_part = email.partition("@")[0].lower()
    if local_part and local_part in password.lower():
        failures.append("password must not contain the email local part")
    return failures


async def create_superadmin(email: str, full_name: str, password: str) -> int:
    from email_validator import EmailNotValidError, validate_email
    from sqlalchemy import select

    from app.core.rls import set_request_rls_context
    from app.core.security import get_password_hash
    from app.db.database import AsyncSessionLocal, engine
    from app.modules.users.models import User, UserRole

    try:
        normalized_email = validate_email(
            email.strip(),
            check_deliverability=False,
        ).normalized.lower()
    except EmailNotValidError as exc:
        print(f"Error: invalid email address: {exc}", file=sys.stderr)
        return 1

    if len(full_name.strip()) < 2:
        print("Error: full name must contain at least 2 characters.", file=sys.stderr)
        return 1

    password_failures = validate_admin_password(password, normalized_email)
    if password_failures:
        for failure in password_failures:
            print(f"Error: {failure}.", file=sys.stderr)
        return 1

    try:
        async with AsyncSessionLocal() as db:
            await set_request_rls_context(db, is_system_admin=True)
            result = await db.execute(select(User).where(User.email == normalized_email))
            existing = result.scalar_one_or_none()
            if existing:
                if existing.role == UserRole.system_admin:
                    print(f"System administrator already exists: {normalized_email}")
                    return 0
                print(
                    "Error: this email already belongs to a non-system-admin account.",
                    file=sys.stderr,
                )
                return 1

            db.add(
                User(
                    id=str(uuid.uuid4()),
                    school_id=None,
                    email=normalized_email,
                    full_name=full_name.strip(),
                    role=UserRole.system_admin,
                    password_hash=get_password_hash(password),
                )
            )
            await db.commit()
        print(f"System administrator created: {normalized_email}")
        return 0
    finally:
        await engine.dispose()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduConnect Management CLI")
    subparsers = parser.add_subparsers(dest="command")

    # generate-keys command
    key_parser = subparsers.add_parser("generate-keys", help="Generate RSA keys for RS256")
    key_parser.add_argument("--output", default="secrets/", help="Output directory for keys")

    admin_parser = subparsers.add_parser(
        "create-superadmin",
        help="Create the first platform system administrator",
    )
    admin_parser.add_argument("--email", required=True)
    admin_parser.add_argument("--full-name", required=True)
    admin_parser.add_argument(
        "--password-env",
        help="Read the password from this environment variable instead of prompting",
    )

    args = parser.parse_args()

    if args.command == "generate-keys":
        generate_keys(args.output)
    elif args.command == "create-superadmin":
        if args.password_env:
            password = os.environ.get(args.password_env, "")
            if not password:
                print(
                    f"Error: environment variable {args.password_env} is empty.",
                    file=sys.stderr,
                )
                raise SystemExit(1)
        else:
            password = getpass.getpass("System administrator password: ")
            confirmation = getpass.getpass("Confirm password: ")
            if password != confirmation:
                print("Error: passwords do not match.", file=sys.stderr)
                raise SystemExit(1)
        raise SystemExit(
            asyncio.run(create_superadmin(args.email, args.full_name, password))
        )
    else:
        parser.print_help()
