export type ProductConfig = {
  appName: string;
  brandName: string;
  companyName: string;
  ownerName: string;
  supportEmail: string;
  primaryServiceCategory: string;
};

function readPublicEnv(key: string, fallback: string) {
  const value = process.env[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

export const productConfig: ProductConfig = {
  appName: readPublicEnv("NEXT_PUBLIC_PRODUCT_APP_NAME", "Marketing VIP"),
  brandName: readPublicEnv("NEXT_PUBLIC_PRODUCT_BRAND_NAME", "Marketing VIP"),
  companyName: readPublicEnv("NEXT_PUBLIC_PRODUCT_COMPANY_NAME", "Web Search Pros"),
  ownerName: readPublicEnv("NEXT_PUBLIC_PRODUCT_OWNER_NAME", "Rudy"),
  supportEmail: readPublicEnv("NEXT_PUBLIC_PRODUCT_SUPPORT_EMAIL", "support@example.com"),
  primaryServiceCategory: readPublicEnv(
    "NEXT_PUBLIC_PRODUCT_PRIMARY_SERVICE_CATEGORY",
    "marketing"
  ),
};

export function getProductConfig() {
  return productConfig;
}
