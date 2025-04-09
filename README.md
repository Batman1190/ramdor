# Ramdor - Your Story in Every Frame

A modern video sharing platform built with Supabase and Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
- Copy `.env.development` to `.env.local`
- Update the values with your Supabase credentials

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Preview production build:
```bash
npm run preview
```

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Development

- The development server runs on `http://localhost:3000`
- Changes to files in `src/` will trigger hot reload
- Environment variables are loaded from `.env.local` or `.env.development`

## Production

Before deploying:
1. Create a `.env.production` file with your production Supabase credentials
2. Run `npm run build`
3. Deploy the contents of the `dist` directory

## Security Notes

- Never commit `.env` files containing production credentials
- Use different Supabase projects for development and production
- Regularly rotate your API keys 