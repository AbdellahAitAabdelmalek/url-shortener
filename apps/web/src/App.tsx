import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function App() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl">URL Shortener</h1>
          </CardTitle>
          <CardDescription>Turn a long link into a short one.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
