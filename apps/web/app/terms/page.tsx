"use client";

import { LegalPage } from "../_components/LegalPage";
import { TermsContent, TERMS_UPDATED } from "../_components/legalContent";
import { useDocumentTitle } from "../_components/useDocumentTitle";

export default function TermsPage() {
  useDocumentTitle("Terms of Service");

  return (
    <LegalPage title="Terms of Service" updated={TERMS_UPDATED}>
      <TermsContent />
    </LegalPage>
  );
}
