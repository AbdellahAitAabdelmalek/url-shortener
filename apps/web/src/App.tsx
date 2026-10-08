import { Link2Icon } from 'lucide-react';
import { Shortener } from '@/features/shorten/Shortener';

export function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Link2Icon className="size-6" aria-hidden />
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">URL Shortener</h1>
        <p className="text-muted-foreground">
          Paste a long link and get a short one, ready to share.
        </p>
      </header>
      <Shortener />
    </main>
  );
}
