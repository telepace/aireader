# Environment Variable Setup Guide

## Required Environment Variables

### Core Configuration
- `REACT_APP_OPENROUTER_API_KEY`: Your OpenRouter API key (required)
  - Get from: https://openrouter.ai/keys
  - Format: `sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Optional Configuration
- `REACT_APP_APP_NAME`: Application name (default: "Prompt Tester")
- `REACT_APP_APP_VERSION`: Application version (default: "1.0.0")
- `REACT_APP_API_BASE_URL`: API base URL (default: https://openrouter.ai/api/v1)

## Setup Steps

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and replace `your_openrouter_api_key_here` with your actual API key

3. Never commit `.env` to version control (already configured in `.gitignore`)

## Security Notes

- `.env` files are automatically ignored by git
- Never share your API key publicly
- Use environment-specific keys for different deployments