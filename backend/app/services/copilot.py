import os
from typing import List, Dict, Any
import google.generativeai as genai
from langchain_huggingface import HuggingFaceEmbeddings
# from pinecone import Pinecone
from app.core.config import settings

class CopilotService:
    def __init__(self):
        # Configure Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

        # Configure Embeddings
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Configure Pinecone
        # if settings.PINECONE_API_KEY:
        #     pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        #     self.index = pc.Index(settings.PINECONE_INDEX_NAME)
        # else:
        #     self.index = None

    def generate_response(self, query: str) -> Dict[str, Any]:
        """
        End-to-end RAG retrieval and generation.
        """
        # 1. Embed query
        query_vector = self.embeddings.embed_query(query)

        # 2. Query Pinecone
        retrieved_contexts = []
        # if self.index:
        #     results = self.index.query(
        #         vector=query_vector,
        #         top_k=3,
        #         include_metadata=True
        #     )
        #     for match in results.matches:
        #         retrieved_contexts.append(match.metadata.get("text", ""))

        # Mocking context for now if Pinecone isn't fully active
        if not retrieved_contexts:
            retrieved_contexts = [
                "The Horizon Balanced Growth Fund has an annual expense ratio of 1.25%.",
                "Management fees are calculated daily and paid monthly.",
                "The fund focuses on long-term capital appreciation."
            ]

        # 3. Construct Prompt
        context_str = "\n\n".join([f"Context {i+1}: {ctx}" for i, ctx in enumerate(retrieved_contexts)])
        prompt = f"""
You are VeriFund AI, an expert financial assistant.
Use the following context to answer the user's query. If you don't know the answer based on the context, say so clearly.

--- CONTEXT ---
{context_str}

--- QUERY ---
{query}
"""
        
        # 4. Generate Response with Gemini
        answer = "I'm sorry, my Gemini API key is not configured."
        if self.model:
            try:
                response = self.model.generate_content(prompt)
                answer = response.text
            except Exception as e:
                answer = f"Error calling Gemini: {e}"

        return {
            "answer": answer,
            "sources": retrieved_contexts,
            "groundedness_score": 0.92 # Placeholder for advanced metric
        }

    async def generate_response_stream(self, query: str):
        """
        Streaming version of RAG retrieval and generation.
        """
        query_vector = self.embeddings.embed_query(query)
        
        # Mocking context for now
        retrieved_contexts = [
            "The Horizon Balanced Growth Fund has an annual expense ratio of 1.25%.",
            "Management fees are calculated daily and paid monthly.",
            "The fund focuses on long-term capital appreciation."
        ]

        context_str = "\n\n".join([f"Context {i+1}: {ctx}" for i, ctx in enumerate(retrieved_contexts)])
        prompt = f"""
You are VeriFund AI, an expert financial assistant.
Use the following context to answer the user's query. If you cite a fact, append a citation tag like [Page 4].

--- CONTEXT ---
{context_str}

--- QUERY ---
{query}
"""
        
        if self.model:
            response = self.model.generate_content(prompt, stream=True)
            for chunk in response:
                yield chunk.text
        else:
            yield "I'm sorry, my Gemini API key is not configured."

copilot_service = CopilotService()
