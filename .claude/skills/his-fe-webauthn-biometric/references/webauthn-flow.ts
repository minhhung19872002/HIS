// TEMPLATE — HIS WebAuthn biometric 2-phase flow (frontend).
// Used in pages-v2/BiometricEnrollment.tsx. API via api/nangcap24.ts object `biometric`.
import { biometric } from '../api/nangcap24';

// ── base64url ↔ ArrayBuffer (WebAuthn needs BufferSource) ──
const b64urlToBuf = (s: string): ArrayBuffer => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};
const bufToB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// ── REGISTER (2 phases) ──
export async function registerBiometric(patientId: string, ownerName: string, deviceName: string) {
  // Phase 1: begin → server returns challenge + rpId
  const begin = await biometric.registerBegin({ patientId, ownerType: 'patient', ownerName, deviceName });
  // Phase 2: browser creates the credential
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: b64urlToBuf(begin.challenge),
      rp: { id: begin.rpId, name: begin.rpName },
      user: { id: b64urlToBuf(begin.userHandle), name: begin.userName, displayName: begin.userDisplayName },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { userVerification: 'required' },
      timeout: 60000,
    },
  })) as PublicKeyCredential;
  const att = cred.response as AuthenticatorAttestationResponse;
  // Phase 2: finish → server stores the credential
  return biometric.registerFinish({
    patientId, ownerType: 'patient', ownerName, deviceName,
    credentialId: bufToB64url(cred.rawId),
    publicKey: bufToB64url(att.getPublicKey?.() ?? new ArrayBuffer(0)),
    userHandle: begin.userHandle,
    clientDataJson: bufToB64url(att.clientDataJSON),
    attestationObject: bufToB64url(att.attestationObject),
  });
}

// ── SIGN (2 phases) ──
export async function signBiometric(patientId: string, documentType: string, documentRef: string) {
  const begin = await biometric.signBegin({ patientId, documentType, documentRef });
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: b64urlToBuf(begin.challenge),
      rpId: begin.rpId,
      allowCredentials: begin.allowCredentials.map((c) => ({
        type: 'public-key' as const, id: b64urlToBuf(c.credentialId),
      })),
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential;
  const asr = assertion.response as AuthenticatorAssertionResponse;
  // finish → server writes BiometricSignatureLog (⚠️ MVP: accept, not yet verifying a real ECDSA/RSA signature)
  return biometric.signFinish({
    patientId, credentialId: bufToB64url(assertion.rawId), documentType, documentRef,
    challenge: begin.challenge,
    clientDataJson: bufToB64url(asr.clientDataJSON),
    authenticatorData: bufToB64url(asr.authenticatorData),
    signature: bufToB64url(asr.signature),
  });
}

/* Notes:
   - HTTPS or localhost is MANDATORY; RpId must match the domain.
   - The api function/DTO names above are illustrative — check the real api/nangcap24.ts object `biometric`.
   - E2E: WebAuthn doesn't run headless → skip or use a CDP virtual authenticator. */
