# Promptfoo Runner UI

Web UI for configuring and running Promptfoo LLM evaluations.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your OpenRouter API key to `.env`:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run eval:run` - Run evaluation via CLI
- `npm run eval:report` - Open latest HTML report
- `npm run eval:reports` - List recent HTML reports
