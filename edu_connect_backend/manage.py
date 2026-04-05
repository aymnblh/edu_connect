import sys
import os
import argparse
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduConnect Management CLI")
    subparsers = parser.add_subparsers(dest="command")

    # generate-keys command
    key_parser = subparsers.add_parser("generate-keys", help="Generate RSA keys for RS256")
    key_parser.add_argument("--output", default="secrets/", help="Output directory for keys")

    args = parser.parse_args()

    if args.command == "generate-keys":
        generate_keys(args.output)
    else:
        parser.print_help()
