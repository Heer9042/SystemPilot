// SystemPilot Centralized Error Handling & Security Sanitization Service
// Enforces "Detailed internally in secure logs, generic externally to users"

export const GenericErrorMessages = {
  GENERAL: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to complete the request. Please check your connection and try again.',
  AUTHENTICATION: 'The sign-in details are incorrect.',
  AUTHORIZATION: 'You do not have permission to perform this action.',
  VALIDATION: 'Please check the information you entered and try again.',
  UPDATE: 'The update could not be completed. Please try again later.',
  DOWNLOAD: 'The download could not be completed. Please try again.',
  INSTALLATION: 'The installation could not be completed. Please try again.',
  FILE: 'The requested file could not be accessed.',
  SAVE: 'Your changes could not be saved. Please try again.',
  LOAD: 'The information could not be loaded. Please try again.',
  SERVER: 'The service is temporarily unavailable. Please try again later.',
  UNEXPECTED: 'An unexpected error occurred. Please try again.',
};

/**
 * Generates a unique, non-sensitive error reference code (e.g. SP-20260926-8F42)
 */
export function generateErrorReferenceId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return `SP-${dateStr}-${randomHex}`;
}

/**
 * Sanitizes any sensitive credential strings from logs (passwords, tokens, keys)
 */
function sanitizeLogData(data) {
  if (!data) return data;
  if (typeof data === 'string') {
    return data.replace(/(password|token|key|secret|credential|auth)[=:\s]+[^\s,;&]+/gi, '$1=[REDACTED]');
  }
  return data;
}

/**
 * Centralized Error Handler
 * Classifies the error, securely logs technical diagnostic data with a reference code,
 * and returns a safe, sanitized generic message for the user interface.
 *
 * @param {Error|string|unknown} error - Raw error caught
 * @param {string} [context='general'] - Functional area context (e.g. 'update', 'network', 'save', 'file')
 * @returns {{ message: string, referenceId: string, isNetwork: boolean }}
 */
export function handleApplicationError(error, context = 'general') {
  const referenceId = generateErrorReferenceId();
  const rawStr = typeof error === 'string' ? error : error?.message || error?.toString() || '';
  const lowerStr = rawStr.toLowerCase();

  // Internal secure logging (only in developer console / local log, with sensitive fields redacted)
  if (typeof console !== 'undefined' && console.error) {
    console.error(`[${referenceId}] Internal SystemPilot Error [${context}]:`, sanitizeLogData(error));
  }

  // Classify into safe, generic user-facing message
  let message = GenericErrorMessages.GENERAL;
  let isNetwork = false;

  if (
    lowerStr.includes('network') ||
    lowerStr.includes('internet') ||
    lowerStr.includes('offline') ||
    lowerStr.includes('abort') ||
    lowerStr.includes('timeout') ||
    lowerStr.includes('fetch') ||
    lowerStr.includes('connection')
  ) {
    message = GenericErrorMessages.NETWORK;
    isNetwork = true;
  } else if (
    lowerStr.includes('permission') ||
    lowerStr.includes('access denied') ||
    lowerStr.includes('unauthorized') ||
    lowerStr.includes('forbidden')
  ) {
    message = GenericErrorMessages.AUTHORIZATION;
  } else if (context === 'update' || lowerStr.includes('update') || lowerStr.includes('installer')) {
    message = GenericErrorMessages.UPDATE;
  } else if (context === 'download' || lowerStr.includes('download')) {
    message = GenericErrorMessages.DOWNLOAD;
  } else if (context === 'save' || lowerStr.includes('setting') || lowerStr.includes('save')) {
    message = GenericErrorMessages.SAVE;
  } else if (context === 'load' || lowerStr.includes('load')) {
    message = GenericErrorMessages.LOAD;
  } else if (context === 'file' || lowerStr.includes('path') || lowerStr.includes('file')) {
    message = GenericErrorMessages.FILE;
  } else if (lowerStr.includes('server') || lowerStr.includes('database') || lowerStr.includes('sqlite')) {
    message = GenericErrorMessages.SERVER;
  }

  return {
    message,
    referenceId,
    isNetwork,
  };
}

/**
 * Convenience helper to return just the clean user-facing error string
 */
export function getUserErrorMessage(error, context = 'general') {
  return handleApplicationError(error, context).message;
}
