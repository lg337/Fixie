export function slugifyCompanyName(value = "") {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "company";
}

export function getCompanyPublicSlug(company = {}) {
  const companyID = Number(company.CompanyID);
  const readableSlug = slugifyCompanyName(company.CompanyName);

  return Number.isFinite(companyID) ? `${readableSlug}-${companyID}` : readableSlug;
}

export function getCompanyPublicPath(company = {}) {
  return `/companies/${getCompanyPublicSlug(company)}`;
}

export function getCompanyIDFromPublicSlug(value = "") {
  const match = String(value).match(/-(\d+)$/);
  if (!match) return null;

  const companyID = Number(match[1]);
  return Number.isFinite(companyID) ? companyID : null;
}
