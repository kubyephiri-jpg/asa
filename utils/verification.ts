// Some accounts (bicycle/cyclist registrations) ended up with TWO verificationStatus fields:
// one at the top of the driver document and one inside `vehicle`. Read both so an approved
// account is never treated as unapproved (which hides the request panel). A real value at the
// top level wins; 'approved' in either place counts as approved.
export function readVerificationStatus(data: any): string | null {
  const top = typeof data?.verificationStatus === 'string' ? data.verificationStatus.trim() : '';
  const nested = typeof data?.vehicle?.verificationStatus === 'string' ? data.vehicle.verificationStatus.trim() : '';
  if (top === 'approved' || nested === 'approved') return 'approved';
  return top || nested || null;
}
