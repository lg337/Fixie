import AsyncStorage from "@react-native-async-storage/async-storage";

const getSavedCompaniesKey = (customerID) => `savedCompanyIDs:${customerID || "guest"}`;

export async function loadSavedCompanyIDs(customerID) {
  const rawValue = await AsyncStorage.getItem(getSavedCompaniesKey(customerID));
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export async function isCompanySaved(customerID, companyID) {
  const savedCompanyIDs = await loadSavedCompanyIDs(customerID);
  return savedCompanyIDs.includes(Number(companyID));
}

export async function toggleSavedCompany(customerID, companyID) {
  const normalizedCompanyID = Number(companyID);
  const savedCompanyIDs = await loadSavedCompanyIDs(customerID);
  const isSaved = savedCompanyIDs.includes(normalizedCompanyID);
  const nextSavedCompanyIDs = isSaved
    ? savedCompanyIDs.filter((id) => id !== normalizedCompanyID)
    : [...savedCompanyIDs, normalizedCompanyID];

  await AsyncStorage.setItem(getSavedCompaniesKey(customerID), JSON.stringify(nextSavedCompanyIDs));
  return nextSavedCompanyIDs;
}
