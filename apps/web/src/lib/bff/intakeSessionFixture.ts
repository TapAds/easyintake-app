import type { IntakeSession } from "@easy-intake/shared";
import { INSURANCE_VERTICAL_CONFIG } from "@easy-intake/shared";

const org = "org_fixture_001";

function baseFields(now: string): IntakeSession["fieldValues"] {
  return {
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
  };
}

/**
 * Stub response for BFF until apps/api session endpoints exist.
 * Shape must satisfy IntakeSession from @easy-intake/shared.
 */
export function getIntakeSessionFixture(sessionId: string): IntakeSession {
  const now = new Date().toISOString();

  if (sessionId === "sess_alpha") {
    return {
      sessionId,
      organizationId: org,
      verticalId: INSURANCE_VERTICAL_CONFIG.vertical,
      configPackageId: INSURANCE_VERTICAL_CONFIG.configPackageId,
      status: "awaiting_hitl",
      substatus: "fixture",
      primaryChannel: "voice",
      channels: [
        {
          channel: "voice",
          externalRef: "CA_alpha_voice",
          startedAt: now,
          metadata: { fixture: true },
        },
        {
          channel: "microsite",
          startedAt: now,
          metadata: { fixture: true },
        },
      ],
      fieldValues: baseFields(now),
      completeness: {
        score: 0.82,
        missingRequiredKeys: ["state"],
      },
      hitl: {
        pendingAgentReview: true,
        pendingDocumentApproval: false,
        pendingFinalSignOff: false,
        pendingApplicantSignature: false,
      },
      externalIds: {
        callSid: "CA_alpha_voice",
        ghlContactId: "ghl_alpha",
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  if (sessionId === "sess_beta") {
    return {
      sessionId,
      organizationId: "org_fixture_002",
      verticalId: INSURANCE_VERTICAL_CONFIG.vertical,
      configPackageId: INSURANCE_VERTICAL_CONFIG.configPackageId,
      status: "ready_to_submit",
      primaryChannel: "web_form",
      channels: [
        {
          channel: "web_form",
          startedAt: now,
          endedAt: now,
        },
        {
          channel: "sms",
          startedAt: now,
        },
      ],
      fieldValues: {
        ...baseFields(now),
        email: {
          value: "jane@example.com",
          provenance: { source: "applicant", channel: "web_form" },
        },
      },
      completeness: { score: 0.96, missingRequiredKeys: [] },
      hitl: {
        pendingAgentReview: false,
        pendingDocumentApproval: false,
        pendingFinalSignOff: true,
        pendingApplicantSignature: false,
      },
      externalIds: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    sessionId,
    organizationId: org,
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
    fieldValues: baseFields(now),
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
