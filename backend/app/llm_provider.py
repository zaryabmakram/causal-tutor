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
        {"id": "gpt-5.6", "label": "OpenAI GPT-5.6 Sol"},
        {"id": "gpt-5.6-pro", "label": "OpenAI GPT-5.6 Sol Pro"},
        {"id": "gpt-5.6-terra", "label": "OpenAI GPT-5.6 Terra"},
        {"id": "gpt-5.6-terra-pro", "label": "OpenAI GPT-5.6 Terra Pro"},
        {"id": "gpt-5.6-luna-pro", "label": "OpenAI GPT-5.6 Luna Pro"},
        {"id": "gpt-5.5", "label": "OpenAI GPT-5.5"},
        {"id": "gpt-5.4-mini", "label": "OpenAI GPT-5.4 Mini"},
        {"id": "gpt-5.4-nano", "label": "OpenAI GPT-5.4 Nano"},
        {"id": "gpt-4o", "label": "OpenAI GPT-4o"},
        {"id": "gpt-4o-mini", "label": "OpenAI GPT-4o Mini"},
    ],
    "openrouter": [
        # OpenAI
        {"id": "openai/gpt-5.6-sol", "label": "OpenAI GPT-5.6 Sol"},
        {"id": "openai/gpt-5.6-sol-pro", "label": "OpenAI GPT-5.6 Sol Pro"},
        {"id": "openai/gpt-5.6-terra", "label": "OpenAI GPT-5.6 Terra"},
        {"id": "openai/gpt-5.6-terra-pro", "label": "OpenAI GPT-5.6 Terra Pro"},
        {"id": "openai/gpt-5.6-luna-pro", "label": "OpenAI GPT-5.6 Luna Pro"},
        {"id": "openai/gpt-5.5", "label": "OpenAI GPT-5.5"},
        {"id": "openai/gpt-5.4-mini", "label": "OpenAI GPT-5.4 Mini"},
        {"id": "openai/gpt-5.4-nano", "label": "OpenAI GPT-5.4 Nano"},
        {"id": "openai/gpt-4o", "label": "OpenAI GPT-4o"},
        {"id": "openai/gpt-4o-mini", "label": "OpenAI GPT-4o Mini"},

        # Anthropic
        {"id": "anthropic/claude-opus-5", "label": "Anthropic Claude Opus 5"},
        {"id": "anthropic/claude-opus-4.8", "label": "Anthropic Claude Opus 4.8"},
        {"id": "anthropic/claude-sonnet-5", "label": "Anthropic Claude Sonnet 5"},
        {"id": "anthropic/claude-sonnet-4.6", "label": "Anthropic Claude Sonnet 4.6"},

        # Google
        {"id": "google/gemini-3.7-pro", "label": "Google Gemini 3.7 Pro"},
        {"id": "google/gemini-3.7-flash", "label": "Google Gemini 3.7 Flash"},

        # xAI
        {"id": "x-ai/grok-4.5", "label": "xAI Grok 4.5"},

        # DeepSeek
        {"id": "deepseek/deepseek-v4", "label": "DeepSeek V4"},

        # Z.ai
        {"id": "z-ai/glm-5.3", "label": "Z.ai GLM 5.3"},

        # Moonshot AI
        {"id": "moonshotai/kimi-k3", "label": "Moonshot Kimi K3"},
    ],
}

_OPENAI_TO_OPENROUTER = {
    "gpt-5.6": "openai/gpt-5.6-sol",
    "gpt-5.6-pro": "openai/gpt-5.6-sol-pro",
    "gpt-5.6-terra": "openai/gpt-5.6-terra",
    "gpt-5.6-terra-pro": "openai/gpt-5.6-terra-pro",
    "gpt-5.6-luna-pro": "openai/gpt-5.6-luna-pro",
    "gpt-5.5": "openai/gpt-5.5",
    "gpt-5.4-mini": "openai/gpt-5.4-mini",
    "gpt-5.4-nano": "openai/gpt-5.4-nano",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
}

_OPENROUTER_TO_OPENAI = {v: k for k, v in _OPENAI_TO_OPENROUTER.items()}
_MODEL_IDS = {
    provider: {option["id"] for option in options}
    for provider, options in _MODEL_OPTIONS.items()
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
        if provider == "openrouter":
            # If the browser has an OpenAI model id cached while OpenRouter is
            # selected, translate it to the equivalent OpenRouter id.
            if explicit in _OPENAI_TO_OPENROUTER:
                return _OPENAI_TO_OPENROUTER[explicit]
            return explicit

        # If the browser has an OpenRouter OpenAI-family id cached while the
        # OpenAI provider is selected, translate it back. Non-OpenAI
        # OpenRouter ids (anthropic/..., google/..., etc.) are not valid for
        # OpenAI and must fall back to a known OpenAI model.
        if explicit in _MODEL_IDS["openai"]:
            return explicit
        if explicit in _OPENROUTER_TO_OPENAI:
            return _OPENROUTER_TO_OPENAI[explicit]
        if "/" in explicit:
            return default_model_for(provider, fallback_openai_model=fallback_openai_model)
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
