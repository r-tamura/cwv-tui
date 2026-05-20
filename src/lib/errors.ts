type SdkError = { name?: string; message?: string };

export function describeAwsError(err: unknown): string {
  const e = err as SdkError;
  const name = e?.name ?? "Error";
  const msg = e?.message ?? String(err);

  switch (name) {
    case "CredentialsProviderError":
    case "CredentialsNotFound":
      return `${msg}\n\nHint: configure credentials via \`aws configure\` or \`aws sso login --profile <name>\`, or set AWS_PROFILE.`;
    case "ExpiredTokenException":
    case "ExpiredToken":
      return `${msg}\n\nHint: your credentials have expired. Re-run \`aws sso login\` or refresh your session.`;
    case "AccessDeniedException":
    case "UnauthorizedOperation":
      return `${msg}\n\nHint: the IAM principal lacks logs:* permissions for this resource.`;
    case "ResourceNotFoundException":
      return `${msg}\n\nHint: the log group/stream may have been deleted, or the region is wrong.`;
    case "ThrottlingException":
    case "TooManyRequestsException":
      return `${msg}\n\nHint: API throttled. Wait a few seconds and retry.`;
    default:
      return msg;
  }
}
