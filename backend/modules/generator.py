from __future__ import annotations

from typing import Sequence

from ollama import Client


def build_prompt(question: str, contexts: Sequence[str]) -> str:
    context_block = "\n\n".join(contexts)
    return (
        "You are a helpful assistant. Use only the provided context. "
        "If the answer is not present, say you do not know.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )


def generate_answer(
    question: str,
    contexts: Sequence[str],
    ollama_url: str,
    model_name: str,
) -> str:
    client = Client(host=ollama_url)
    prompt = build_prompt(question=question, contexts=contexts)
    response = client.generate(model=model_name, prompt=prompt)
    return response.get("response", "")
