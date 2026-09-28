from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "VeriFund AI"

    API_V1_STR: str = "/api/v1"
    
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

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
