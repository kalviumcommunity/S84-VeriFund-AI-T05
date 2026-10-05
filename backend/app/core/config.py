from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "VeriFund AI"
    API_V1_STR: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Security
    SECRET_KEY: str = "dev_secret_key_change_in_prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/verifund"
    
    # Vector Database
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX_NAME: str = ""
    
    # External APIs
    GEMINI_API_KEY: str = ""
    LLAMA_CLOUD_API_KEY: str = ""
    
    # AWS / Neon Object Storage
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL_S3: str = ""
    AWS_REGION: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
