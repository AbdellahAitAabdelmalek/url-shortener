import { Loader2Icon } from 'lucide-react';
import { type FormEvent, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShortenFormProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
}

export function ShortenForm({ url, onUrlChange, onSubmit, isPending, error }: ShortenFormProps) {
  const inputId = useId();
  const errorId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Long URL
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          // Not type="url": the browser would reject "stoik.com", which the schema accepts.
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://example.com/a/very/long/link"
          value={url}
          // Read-only rather than disabled: the field keeps the focus, and what would be typed
          // during the request would be lost when the field is cleared on success.
          readOnly={isPending}
          onChange={(event) => onUrlChange(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className="h-10 sm:flex-1"
        />
        <Button type="submit" disabled={isPending} className="h-10 sm:w-32">
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" aria-hidden />
              Shortening…
            </>
          ) : (
            'Shorten'
          )}
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
