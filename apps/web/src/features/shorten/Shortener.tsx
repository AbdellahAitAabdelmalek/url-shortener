import { useMutation } from '@tanstack/react-query';
import { LongUrlSchema } from '@url-shortener/shared';
import { useState } from 'react';
import { createLink } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { ResultCard, ResultCardSkeleton } from './ResultCard';
import { ShortenForm } from './ShortenForm';

export function Shortener() {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: createLink });

  function handleUrlChange(value: string) {
    setUrl(value);
    // The previous error no longer applies to what is being typed.
    setValidationError(null);
    if (mutation.isError) mutation.reset();
  }

  function handleSubmit() {
    if (mutation.isPending) return;

    // The rules of the API, checked before the round trip.
    const parsed = LongUrlSchema.safeParse(url);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Please enter a valid URL.');
      return;
    }
    mutation.mutate({ url: parsed.data }, { onSuccess: () => setUrl('') });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <ShortenForm
            url={url}
            onUrlChange={handleUrlChange}
            onSubmit={handleSubmit}
            isPending={mutation.isPending}
            // ApiClientError messages are written for the user.
            error={validationError ?? mutation.error?.message ?? null}
          />
        </CardContent>
      </Card>
      {mutation.isPending && <ResultCardSkeleton />}
      {mutation.data && <ResultCard key={mutation.data.link.code} result={mutation.data} />}
    </div>
  );
}
