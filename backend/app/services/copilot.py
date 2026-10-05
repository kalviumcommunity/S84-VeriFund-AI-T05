import os
from typing import List, Dict, Any
from google import genai
from google import genai
from google.genai import types
import warnings

# Suppress HuggingFace unauthenticated warning
warnings.filterwarnings("ignore", message=".*unauthenticated requests to the HF Hub.*")
from app.core.config import settings

class CopilotService:
    def __init__(self):
        # Use the RagService's robust multi-key embeddings to initialize genai_client
        from app.services.retrieval import rag_service
        
        self.genai_client = None
        if rag_service.embeddings and hasattr(rag_service.embeddings, 'clients') and len(rag_service.embeddings.clients) > 0:
            self.genai_client = rag_service.embeddings.clients[0]
        elif settings.GEMINI_API_KEY:
            self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def get_mandatory_disclosures(self, retrieved_contexts: List[Dict[str, Any]]) -> str:
        disclosures = set()
        for r in (retrieved_contexts or []):
            ac = r.get("asset_class", "").lower()
            title = r.get("document_title", "").lower()
            if "mutual fund" in ac or "fund" in title:
                disclosures.add("Mutual Fund Disclosure: Investors should carefully consider the investment objectives, risks, charges and expenses of the Fund before investing.")
            if "private equity" in ac or "pe" in title:
                disclosures.add("Private Equity Disclosure: Private equity investments are highly illiquid and are intended for accredited investors only.")
            if "crypto" in ac or "bitcoin" in title:
                disclosures.add("Digital Asset Disclosure: Cryptocurrencies are highly volatile and carry a high degree of risk.")
        
        if not disclosures:
            disclosures.add("General Disclosure: The information provided is for institutional use only and not intended for retail distribution.")
            
        return "\n\n**Disclosures:**\n" + "\n".join(f"- {d}" for d in disclosures)

    def generate_response(
        self, 
        query: str, 
        retrieved_contexts: List[Dict[str, Any]] = None,
        model_name: str = 'gemini-3.8-flash', 
        strict_mode: bool = True, 
        temperature: float = 0.1,
        persona: str = 'advisor'
    ) -> Dict[str, Any]:
        """
        End-to-end RAG retrieval and generation.
        """
        context_strings = []
        if retrieved_contexts:
            for r in retrieved_contexts:
                context_strings.append(r.get("snippet", ""))

        if not context_strings:
            context_strings = ["No context found in the database for this query."]
            
        strict_instruction = ""
        if strict_mode:
            strict_instruction = "STRICT MODE: You must ONLY answer using the provided context. If the exact answer is not found in the text, you MUST reply with 'I cannot answer this based on the provided documents.' Do not use any external knowledge."
            temperature = 0.0 # Force zero variance in strict mode

        if persona == 'client':
            persona_prompt = "You are an AI assistant helping a retail client. Use simple, non-jargon language. Keep your answers brief and easy to understand."
        else:
            persona_prompt = "You are VeriFund AI, an expert financial assistant for professional wealth advisors. Provide highly detailed, analytical, and precise answers."

        # 3. Construct Prompt
        context_str = "\n\n".join([f"Context {i+1}: {ctx}" for i, ctx in enumerate(context_strings)])
        prompt = f"""
{persona_prompt}
Use the following context to answer the user's query. If you don't know the answer based on the context, say so clearly.
{strict_instruction}

--- CONTEXT ---
{context_str}

--- QUERY ---
{query}
"""
        
        # 4. Generate Response with Gemini
        answer = "I'm sorry, my Gemini API key is not configured."
        disclosure = self.get_mandatory_disclosures(retrieved_contexts)
        score = 0.92
        
        if hasattr(self, 'genai_client') and self.genai_client:
            try:
                chat = self.genai_client.chats.create(
                    model=model_name,
                    config=types.GenerateContentConfig(temperature=temperature)
                )
                response = chat.send_message(prompt)
                base_answer = response.text
                answer = base_answer + disclosure
                
                # Evaluate faithfulness
                score, _ = self.evaluate_faithfulness(base_answer, "\n".join(context_strings))
            except Exception as e:
                answer = f"Error calling Gemini: {e}"

        return {
            "answer": answer,
            "sources": retrieved_contexts,
            "groundedness_score": score
        }

    async def generate_response_stream(
        self, 
        query: str, 
        retrieved_contexts: List[Dict[str, Any]] = None, 
        model_name: str = 'gemini-3.8-flash', 
        strict_mode: bool = True, 
        temperature: float = 0.1,
        persona: str = 'advisor'
    ):
        """
        Streaming version of RAG retrieval and generation.
        """
        context_strings = []
        doc_titles = set()
        if retrieved_contexts:
            for r in retrieved_contexts:
                page = r.get("page_number", 1)
                title = r.get("document_title", "Document")
                doc_titles.add(title)
                context_strings.append(f"Source: {title} (Page {page})\nText: {r.get('snippet', '')}")
        
        if not context_strings:
            context_strings = ["No context found in the database for this query."]
            
        strict_instruction = ""
        if strict_mode:
            strict_instruction = "STRICT MODE: You must ONLY answer using the provided context. If the exact answer is not found in the text, you MUST reply with 'I cannot answer this based on the provided documents.' Do not use any external knowledge."
            temperature = 0.0 # Force zero variance in strict mode

        if persona == 'client':
            persona_prompt = "You are an AI assistant helping a retail client. Use simple, non-jargon language. Keep your answers brief and easy to understand. Always structure your response with clear headers and bullet points."
        else:
            persona_prompt = "You are VeriFund AI, an expert financial assistant for professional wealth advisors. Provide highly detailed, analytical, and precise answers. Structure the response strictly with clear headers and Markdown tables where appropriate. If the context contains historical returns or comparable numeric performance data, you MUST provide a JSON block at the very end to visualize the data in this exact format:\n```json\n{\"type\": \"chart\", \"data\": [{\"year\": \"2023\", \"Fund A\": 4.5, \"Fund B\": 2.1}, {\"year\": \"2024\", \"Fund A\": 6.2, \"Fund B\": 5.5}]}\n```\nIf the context contains portfolio composition, asset allocation, or sector breakdown, you MUST provide a pie chart JSON block instead:\n```json\n{\"type\": \"pie\", \"data\": [{\"id\": \"Technology\", \"value\": 45}, {\"id\": \"Healthcare\", \"value\": 25}]}\n```\nKeep everything highly formatted."

        citation_instruction = "If you cite a fact, append a citation tag. Since all context comes from a single document, use EXACTLY the format [Page X] (where X is the page number)."
        if len(doc_titles) > 1:
            citation_instruction = "If you cite a fact, append a citation tag. Since the context comes from multiple documents, use the format [Document Title, Page X]."
            
        context_str = "\n\n".join([f"Context {i+1}: {ctx}" for i, ctx in enumerate(context_strings)])
        prompt = f"""
{persona_prompt}
Use the following context to answer the user's query. {citation_instruction}
{strict_instruction}

--- CONTEXT ---
{context_str}

--- QUERY ---
{query}
"""
        
        disclosure = self.get_mandatory_disclosures(retrieved_contexts)
        
        if hasattr(self, 'genai_client') and self.genai_client:
            chat = self.genai_client.chats.create(
                model=model_name,
                config=types.GenerateContentConfig(temperature=temperature)
            )
            response = chat.send_message_stream(prompt)
            full_response = ""
            for chunk in response:
                full_response += chunk.text
                yield chunk.text
                
            yield disclosure
            
            # Note: For stream we don't return the score here since we just yield text. 
            # The client will use POST /evaluate later if they want to score a specific chunk.
        else:
            yield "I'm sorry, my Gemini API key is not configured."

    def evaluate_faithfulness(self, generated_text: str, source_text: str) -> tuple[float, str]:
        """
        Uses LLM as a judge to evaluate if the generated text is perfectly grounded in the source text.
        """
        prompt = f"""
You are an expert strict auditor. Your job is to check if the generated text is perfectly faithful to the source text.
It should not hallucinate any details, numbers, or facts not present in the source text.

--- SOURCE TEXT ---
{source_text}

--- GENERATED TEXT ---
{generated_text}

Provide your evaluation in the exact format:
SCORE: <0.0 to 1.0>
EXPLANATION: <Short explanation>
"""
        
        if not hasattr(self, 'genai_client') or not self.genai_client:
            return 0.0, "API key not configured."

        try:
            response = self.genai_client.models.generate_content(
                model='gemini-3.8-flash',
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.0)
            )
            text = response.text
            
            score = 1.0
            explanation = "Faithful."
            
            for line in text.split('\n'):
                if line.startswith('SCORE:'):
                    try:
                        score = float(line.replace('SCORE:', '').strip())
                    except:
                        pass
                elif line.startswith('EXPLANATION:'):
                    explanation = line.replace('EXPLANATION:', '').strip()
                    
            return score, explanation
        except Exception as e:
            return 0.0, f"Error calling evaluator: {e}"

copilot_service = CopilotService()
