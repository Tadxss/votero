"use client";

import { LegalPage } from "../_components/LegalPage";
import { PrivacyContent, PRIVACY_UPDATED } from "../_components/legalContent";
import { useDocumentTitle } from "../_components/useDocumentTitle";

export default function PrivacyPage() {
  useDocumentTitle("Privacy Policy");

  return (
    <LegalPage title="Privacy Policy" updated={PRIVACY_UPDATED}>
      <PrivacyContent />
    </LegalPage>
  );
}
