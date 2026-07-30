"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";

// Only fires for errors that escape every other error boundary (e.g. a crash in the root layout
// itself) — normal route-level errors go through app/error.tsx equivalents instead, which this
// project doesn't have yet either; both are separate from the friendly inline error states each
// page already renders for expected failures (lobby not found, forbidden, etc.).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
