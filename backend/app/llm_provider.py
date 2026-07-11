import os
from dataclasses import dataclass
from typing import Dict, List, Literal, Optional

from openai import AsyncOpenAI

LLMProvider = Literal["openai", "openrouter"]

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_PROVIDER: LLMProvider = "openai"

# Minimal curated model lists to keep the UI stable and avoid unsupported IDs.
_MODEL_OPTIONS: Dict[LLMProvider, List[Dict[str, str]]] = {
    "openai": [
        {"id": "gpt-4o", "label": "GPT-4o"},
        {"id": "gpt-4o-mini", "label": "GPT-4o Mini"},
    ],
    "openrouter": [
        {"id": "openai/gpt-4o", "label": "OpenAI GPT-4o"},
        {"id": "openai/gpt-4o-mini", "label": "OpenAI GPT-4o Mini"},
        {"id": "openai/gpt-5", "label": "OpenAI GPT-5"},
        {"id": "openai/gpt-5-mini", "label": "OpenAI GPT-5 Mini"},
        {"id": "anthropic/claude-3.5-sonnet", "label": "Anthropic Claude 3.5 Sonnet"},
        {"id": "anthropic/claude-opus-4", "label": "Anthropic Claude Opus 4"},
        {"id": "google/gemini-2.0-pro", "label": "Google Gemini 2.0 Pro"},
        {"id": "meta-llama/llama-3.1-405b-instruct", "label": "Meta Llama 3.1 405B Instruct"},
        {"id": "qwen/qwen-2.5-72b-instruct", "label": "Qwen 2.5 72B Instruct"},
        {"id": "mistralai/mixtral-8x22b-instruct", "label": "Mixtral 8x22B Instruct"},
        {"id": "meta-llama/llama-3.2-3b-instruct", "label": "Meta Llama 3.2 3B Instruct"},
        {"id": "qwen/qwen-2.5-7b-instruct", "label": "Qwen 2.5 7B Instruct"},
    ],
}

_OPENAI_TO_OPENROUTER = {
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
}


@dataclass(frozen=True)
class LLMRequestContext:
    provider: LLMProvider
    api_key: str
    model: Optional[str] = None


def provider_label(provider: LLMProvider) -> str:
    return "OpenRouter" if provider == "openrouter" else "OpenAI"


def normalize_provider(raw_provider: Optional[str]) -> LLMProvider:
    value = (raw_provider or "").strip().lower()
    if value in {"openrouter", "open-router"}:
        return "openrouter"
    return "openai"


def model_options(provider: LLMProvider) -> List[Dict[str, str]]:
    return list(_MODEL_OPTIONS[provider])


def default_model_for(provider: LLMProvider, fallback_openai_model: str = "gpt-4o") -> str:
    if provider == "openai":
        return fallback_openai_model
    return _OPENAI_TO_OPENROUTER.get(fallback_openai_model, "openai/gpt-4o-mini")


def resolve_model(
    provider: LLMProvider,
    requested_model: Optional[str],
    fallback_openai_model: str = "gpt-4o",
) -> str:
    explicit = (requested_model or "").strip()
    if explicit:
        return explicit
    return default_model_for(provider, fallback_openai_model=fallback_openai_model)


def build_async_client(provider: LLMProvider, api_key: str) -> AsyncOpenAI:
    if provider == "openrouter":
        return AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
    return AsyncOpenAI(api_key=api_key)


def env_key_for(provider: LLMProvider) -> str:
    if provider == "openrouter":
        return os.getenv("OPENROUTER_API_KEY", "") or ""
    return os.getenv("OPENAI_API_KEY", "") or ""
