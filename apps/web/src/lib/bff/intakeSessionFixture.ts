import type { IntakeSession } from "@easy-intake/shared";
import { INSURANCE_VERTICAL_CONFIG } from "@easy-intake/shared";

/**
 * Stub response for BFF until apps/api session endpoints exist.
 * Shape must satisfy IntakeSession from @easy-intake/shared.
 */
export function getIntakeSessionFixture(sessionId: string): IntakeSession {
  const now = new Date().toISOString();
  return {
    sessionId,
    organizationId: "org_fixture_001",
    verticalId: INSURANCE_VERTICAL_CONFIG.vertical,
    configPackageId: INSURANCE_VERTICAL_CONFIG.configPackageId,
    status: "collecting",
    substatus: "fixture",
    primaryChannel: "voice",
    channels: [
      {
        channel: "voice",
        externalRef: "CA_fixture_call_sid",
        startedAt: now,
        metadata: { fixture: true },
      },
    ],
    fieldValues: {
      firstName: {
        value: "Jane",
        provenance: {
          source: "ai",
          channel: "voice",
          confidence: 0.92,
          updatedAt: now,
        },
      },
      lastName: {
        value: "Doe",
        provenance: { source: "ai", channel: "voice", confidence: 0.88 },
      },
      phone: {
        value: "+15551234567",
        provenance: { source: "agent", channel: "voice", updatedAt: now },
      },
    },
    completeness: {
      score: 0.35,
      missingRequiredKeys: [
        "dateOfBirth",
        "state",
        "coverageAmountDesired",
        "productTypeInterest",
      ],
    },
    hitl: {
      pendingAgentReview: false,
      pendingDocumentApproval: false,
      pendingFinalSignOff: false,
      pendingApplicantSignature: false,
    },
    externalIds: {
      callSid: "CA_fixture_call_sid",
      ghlContactId: "ghl_fixture_contact",
    },
    createdAt: now,
    updatedAt: now,
  };
}
