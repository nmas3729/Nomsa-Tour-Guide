import "server-only";

import crypto from "node:crypto";
import { isIP } from "node:net";
import { getServerEnvironment } from "@/src/config/env";

export interface PayFastPaymentRequest {
  paymentReference: string;
  amount: number;
  itemName: string;
  itemDescription?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  cellNumber?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PayFastFormPayload {
  processUrl: string;
  fields: Record<string, string>;
}

export const PAYFAST_SANDBOX_PROCESS_URL = "https://sandbox.payfast.co.za/eng/process";
export const PAYFAST_PRODUCTION_PROCESS_URL = "https://www.payfast.co.za/eng/process";
export const PAYFAST_SANDBOX_VALIDATE_URL = "https://sandbox.payfast.co.za/eng/query/validate";
export const PAYFAST_PRODUCTION_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate";

function formEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function generatePayFastSignature(
  params: Record<string, string | undefined>,
  passphrase?: string,
): string {
  const parameterString = Object.keys(params)
    .filter((key) => key !== "signature" && params[key] !== undefined && params[key] !== "")
    .map((key) => `${key}=${formEncode(params[key] ?? "")}`)
    .join("&");
  const signatureString = passphrase?.trim()
    ? `${parameterString}&passphrase=${formEncode(passphrase)}`
    : parameterString;

  return crypto.createHash("md5").update(signatureString).digest("hex");
}

function matchesConfiguredSourceIp(sourceIp: string | null, configuredIps: string): boolean {
  if (!sourceIp || isIP(sourceIp) !== 4) {
    return false;
  }

  const source = sourceIp.split(".").reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0;
  return configuredIps.split(",").some((entry) => {
    const [address, prefixText] = entry.trim().split("/");
    if (!address || isIP(address) !== 4) {
      return false;
    }
    const prefix = prefixText === undefined ? 32 : Number(prefixText);
    if (!Number.isInteger(prefix) || prefix < 24 || prefix > 32) {
      return false;
    }
    const network = address.split(".").reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0;
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (source & mask) === (network & mask);
  });
}

function requiredPayFastConfig() {
  const env = getServerEnvironment();
  if (!env.PAYFAST_SANDBOX || !env.PAYFAST_MERCHANT_ID || !env.PAYFAST_SOURCE_IPS) {
    throw new Error("PAYFAST_SANDBOX, PAYFAST_MERCHANT_ID, and PAYFAST_SOURCE_IPS must be configured.");
  }
  const configuredIps = env.PAYFAST_SOURCE_IPS.split(",").map((entry) => entry.trim());
  if (
    configuredIps.length === 0 ||
    configuredIps.some((entry) => {
      const [address, prefixText, extra] = entry.split("/");
      const prefix = prefixText === undefined ? 32 : Number(prefixText);
      return (
        !address ||
        isIP(address) !== 4 ||
        extra !== undefined ||
        !Number.isInteger(prefix) ||
        prefix < 24 ||
        prefix > 32
      );
    })
  ) {
    throw new Error("PAYFAST_SOURCE_IPS must contain valid IPv4 addresses or IPv4 CIDR ranges.");
  }
  return {
    sandbox: env.PAYFAST_SANDBOX === "true",
    merchantId: env.PAYFAST_MERCHANT_ID,
    passphrase: env.PAYFAST_PASSPHRASE,
    sourceIps: env.PAYFAST_SOURCE_IPS,
  };
}

export function assertPayFastConfiguration(): void {
  requiredPayFastConfig();
}

export function createPayFastPaymentPayload(
  request: PayFastPaymentRequest,
): PayFastFormPayload {
  const config = requiredPayFastConfig();
  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    return_url: request.returnUrl,
    cancel_url: request.cancelUrl,
    notify_url: request.notifyUrl,
    name_first: request.firstName || "Guest",
    name_last: request.lastName || "Traveller",
    email_address: request.emailAddress || "guest@nomsatourguides.co.za",
    cell_number: request.cellNumber || "0820000000",
    m_payment_id: request.paymentReference,
    amount: request.amount.toFixed(2),
    item_name: request.itemName.slice(0, 100),
  };

  if (request.itemDescription) {
    fields.item_description = request.itemDescription.slice(0, 255);
  }

  fields.signature = generatePayFastSignature(fields, config.passphrase);
  return {
    processUrl: config.sandbox ? PAYFAST_SANDBOX_PROCESS_URL : PAYFAST_PRODUCTION_PROCESS_URL,
    fields,
  };
}

export async function verifyPayFastITN(
  itnData: Record<string, string>,
  rawBody: string,
  sourceIp: string | null,
): Promise<{ valid: boolean; reason?: string }> {
  const config = requiredPayFastConfig();

  if (!matchesConfiguredSourceIp(sourceIp, config.sourceIps)) {
    return { valid: false, reason: "ITN source IP is not trusted." };
  }

  const receivedSignature = itnData.signature?.toLowerCase();
  if (!receivedSignature || !/^[a-f0-9]{32}$/.test(receivedSignature)) {
    return { valid: false, reason: "Missing or malformed ITN signature." };
  }
  const expectedSignature = generatePayFastSignature(itnData, config.passphrase);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return { valid: false, reason: "ITN signature does not match." };
  }

  const validateUrl = config.sandbox
    ? PAYFAST_SANDBOX_VALIDATE_URL
    : PAYFAST_PRODUCTION_VALIDATE_URL;
  let response: Response;
  try {
    response = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { valid: false, reason: "Unable to validate ITN with PayFast." };
  }

  if (!response.ok) {
    return { valid: false, reason: `PayFast validation returned HTTP ${response.status}.` };
  }
  const responseText = (await response.text()).trim();
  if (responseText !== "VALID") {
    return { valid: false, reason: "PayFast did not validate the ITN." };
  }
  return { valid: true };
}
