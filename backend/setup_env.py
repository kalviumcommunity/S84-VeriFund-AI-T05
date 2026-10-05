import secrets
import string

def generate_secret():
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for i in range(32))

secret = generate_secret()

env_content = f"""# VeriFund AI - Environment Variables

# Security
SECRET_KEY="{secret}"
ACCESS_TOKEN_EXPIRE_MINUTES=11520 # 8 days

# Database (NeonDB Postgres placeholder)
DATABASE_URL="postgresql://user:password@ep-shiny-cloud-123456.us-east-2.aws.neon.tech/verifund?sslmode=require"

# Vector Database (Pinecone placeholder)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-west-2-gcp"
PINECONE_INDEX_NAME="verifund-index"

# External APIs
GEMINI_API_KEY="your-gemini-api-key"
"""

with open("c:\\Users\\krish\\Desktop\\SW Main\\backend\\.env", "w") as f:
    f.write(env_content)
