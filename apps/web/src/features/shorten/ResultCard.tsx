import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CreateLinkResult } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COPIED_FEEDBACK_MS = 2000;

export function ResultCard({ result: { link, created } }: { result: CreateLinkResult }) {
  const copyButton = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  // The card is mounted for each new link: keyboard users can copy it right away.
  useEffect(() => {
    copyButton.current?.focus();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      toast.success('Link copied to the clipboard.');
    } catch {
      toast.error('Could not copy the link. Select it and copy it manually.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {created ? 'Your short link is ready' : 'This URL already has a short link'}
        </CardTitle>
        <CardDescription className="truncate" title={link.originalUrl}>
          {link.originalUrl}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-mono text-lg font-medium underline-offset-4 hover:underline"
        >
          {link.shortUrl.replace(/^https?:\/\//, '')}
        </a>
        <Button ref={copyButton} variant="outline" onClick={copy} className="h-10 sm:w-32">
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Takes the place of the result card while the link is created, with the same layout. */
export function ResultCardSkeleton() {
  return (
    <Card aria-busy="true">
      <p role="status" className="sr-only">
        Creating your short link…
      </p>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-7 sm:flex-1" />
        <Skeleton className="h-10 sm:w-32" />
      </CardContent>
    </Card>
  );
}
