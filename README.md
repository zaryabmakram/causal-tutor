# Causal Tutor

An AI-powered research assistant for Causal Inference. It helps students and researchers understand the methodology of research papers (DiD, IV, RDD, etc.) through interactive analysis and chat.

## Tech Stack

- **Backend:** Python (FastAPI), OpenAI (GPT-4o), PyPDF
- **Frontend:** TypeScript (Next.js), Tailwind CSS
- **Infrastructure:** Docker Compose

## Prerequisites

- Docker & Docker Compose
- OpenAI API Key

## Getting Started

1. Create a `.env` file in the root directory and add your OpenAI API Key:
   ```bash
   OPENAI_API_KEY=sk-...
   ```

2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

3. Open your browser:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Features

- **PDF Analysis:** Upload a research paper to get a structured breakdown of the Causal Query, Methodology, and Results.
- **Evidence Extraction:** The system cites specific paragraphs and page numbers for every claim.
- **Tutor Chat:** Ask follow-up questions about the paper's design or causal concepts.

## Development

The codebase is structured as a monorepo:
- `backend/`: FastAPI application
- `frontend/`: Next.js application

Changes to the code will hot-reload in the containers (volumes are mounted).
