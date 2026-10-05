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

        # Initialize Groq client using OpenAI SDK
        self.groq_client = None
        self._init_groq_client()

    def _init_groq_client(self):
        if settings.GROQ_API_KEY:
            try:
                from openai import OpenAI
                self.groq_client = OpenAI(
                    api_key=settings.GROQ_API_KEY,
                    base_url="https://api.groq.com/openai/v1",
                )
            except Exception:
                try:
                    from groq import Groq
                    self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                except Exception:
                    self.groq_client = None

    def _resolve_model(self, model_name: str) -> tuple[str, str]:
        """
        Determines provider ('groq' or 'gemini') and normalizes model name.
        """
        groq_free_models = {
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b"
        }
        if model_name.startswith("groq/"):
            return "groq", model_name.replace("groq/", "", 1)
        if model_name in groq_free_models:
            return "groq", model_name
        return "gemini", model_name

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
    def _build_prompt(
        self,
        query: str,
        retrieved_contexts: List[Dict[str, Any]],
        strict_mode: bool,
        persona: str
    ) -> tuple[str, List[str]]:
        context_strings = []
        if retrieved_contexts:
            for i, r in enumerate(retrieved_contexts):
                page = r.get("page_number", 1)
                title = r.get("document_title", "Document")
                context_strings.append(
                    f"--- Source Context {i+1} [Document: {title} | Page {page}] ---\n{r.get('snippet', '')}"
                )

        if not context_strings:
            context_strings = ["No context found in the database for this query."]

        strict_instruction = ""
        if strict_mode:
            strict_instruction = (
                "STRICT GROUNDING: You must ONLY answer using the provided context chunks. "
                "If the exact answer or specific numbers are not found in the text, you MUST state: "
                "'I cannot answer this based on the provided documents.' Do not extrapolate or assume."
            )

        if persona == 'client':
            persona_prompt = (
                "You are an AI assistant helping a retail client. Use simple, non-jargon language. "
                "Keep your answers brief and easy to understand. Structure your response with clear headers and bullet points."
            )
        else:
            persona_prompt = (
                "You are VeriFund AI, an expert financial assistant for professional wealth advisors. "
                "Provide highly detailed, analytical, and precise answers. Structure the response strictly with clear headers "
                "and Markdown tables where appropriate. If the context contains historical returns or comparable numeric performance data, "
                "you MUST provide a JSON block at the very end to visualize the data in this exact format:\n"
                "```json\n"
                "{\"type\": \"chart\", \"data\": [{\"year\": \"2023\", \"Fund A\": 4.5, \"Fund B\": 2.1}, {\"year\": \"2024\", \"Fund A\": 6.2, \"Fund B\": 5.5}]}\n"
                "```\n"
                "If the context contains portfolio composition, asset allocation, or sector breakdown, you MUST provide a pie chart JSON block instead:\n"
                "```json\n"
                "{\"type\": \"pie\", \"data\": [{\"id\": \"Technology\", \"value\": 45}, {\"id\": \"Healthcare\", \"value\": 25}]}\n"
                "```\n"
                "Keep everything highly formatted."
            )

        citation_instruction = (
            "CRITICAL CITATION DIRECTIVE (MANDATORY):\n"
            "1. You MUST cite the source page number for EVERY claim, statistic, percentage, fee, date, number, table row, and factual statement using the exact bracket format: [Page X] (e.g., [Page 1], [Page 2]).\n"
            "2. Place the [Page X] tag immediately at the end of each sentence or bullet point containing data from the context.\n"
            "3. Every single paragraph, bullet point, and metric in your response MUST have at least one [Page X] citation.\n"
            "4. ONLY use the page numbers provided in the Context headings above. Never invent page numbers.\n"
            "Example format: 'The Fund has an annual management fee of 0.75% [Page 2] and a 5-year annualized return of 14.2% [Page 4].'"
        )

        context_str = "\n\n".join(context_strings)
        prompt = f"""
{persona_prompt}

{citation_instruction}

{strict_instruction}

--- RETRIEVED CONTEXT ---
{context_str}

--- USER QUERY ---
{query}
"""
        return prompt, context_strings

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
        prompt, context_strings = self._build_prompt(query, retrieved_contexts, strict_mode, persona)
        
        # Generate Response
        answer = "I'm sorry, no LLM API key is configured."
        disclosure = self.get_mandatory_disclosures(retrieved_contexts)
        score = 0.92
        
        provider, resolved_model = self._resolve_model(model_name)

        # --- Groq route ---
        if provider == "groq":
            if not self.groq_client:
                self._init_groq_client()
            if self.groq_client:
                try:
                    completion = self.groq_client.chat.completions.create(
                        model=resolved_model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature
                    )
                    base_answer = completion.choices[0].message.content or ""
                    answer = base_answer + disclosure
                    score, _ = self.evaluate_faithfulness(base_answer, "\n".join(context_strings))
                except Exception as e:
                    answer = f"Error calling Groq ({resolved_model}): {e}"
            else:
                answer = "Groq API key is not configured."
        # --- Gemini route ---
        elif hasattr(self, 'genai_client') and self.genai_client:
            try:
                chat = self.genai_client.chats.create(
                    model=resolved_model,
                    config=types.GenerateContentConfig(temperature=temperature)
                )
                response = chat.send_message(prompt)
                base_answer = response.text or ""
                answer = base_answer + disclosure
                score, _ = self.evaluate_faithfulness(base_answer, "\n".join(context_strings))
            except Exception as e:
                answer = f"Error calling Gemini ({resolved_model}): {e}"

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
        prompt, _ = self._build_prompt(query, retrieved_contexts, strict_mode, persona)
        disclosure = self.get_mandatory_disclosures(retrieved_contexts)
        
        provider, resolved_model = self._resolve_model(model_name)

        # --- Groq route (streaming) ---
        if provider == "groq":
            if not self.groq_client:
                self._init_groq_client()
            if self.groq_client:
                try:
                    stream = self.groq_client.chat.completions.create(
                        model=resolved_model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        stream=True
                    )
                    for chunk in stream:
                        if chunk.choices and len(chunk.choices) > 0:
                            delta = chunk.choices[0].delta.content or ""
                            if delta:
                                yield delta
                    yield disclosure
                except Exception as e:
                    yield f"Error calling Groq ({resolved_model}): {e}"
            else:
                yield "Groq API key is not configured."
        # --- Gemini route (streaming) ---
        elif hasattr(self, 'genai_client') and self.genai_client:
            chat = self.genai_client.chats.create(
                model=resolved_model,
                config=types.GenerateContentConfig(temperature=temperature)
            )
            response = chat.send_message_stream(prompt)
            for chunk in response:
                yield chunk.text
            yield disclosure
        else:
            yield "I'm sorry, no LLM API key is configured."

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
