// ISO 3166-1 alpha-2 reference list (subset can be extended freely).
export const COUNTRIES: { code: string; name: string }[] = [
  ["AR", "Argentina"], ["AU", "Australia"], ["AT", "Austria"], ["BD", "Bangladesh"], ["BE", "Belgium"],
  ["BR", "Brazil"], ["BG", "Bulgaria"], ["CM", "Cameroon"], ["CA", "Canada"], ["CL", "Chile"], ["CN", "China"],
  ["CO", "Colombia"], ["HR", "Croatia"], ["CZ", "Czechia"], ["DK", "Denmark"], ["EG", "Egypt"], ["EE", "Estonia"],
  ["ET", "Ethiopia"], ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GH", "Ghana"], ["GR", "Greece"],
  ["HK", "Hong Kong"], ["HU", "Hungary"], ["IS", "Iceland"], ["IN", "India"], ["ID", "Indonesia"], ["IE", "Ireland"],
  ["IL", "Israel"], ["IT", "Italy"], ["JM", "Jamaica"], ["JP", "Japan"], ["JO", "Jordan"], ["KE", "Kenya"],
  ["KR", "South Korea"], ["LV", "Latvia"], ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MY", "Malaysia"],
  ["MX", "Mexico"], ["MA", "Morocco"], ["NL", "Netherlands"], ["NZ", "New Zealand"], ["NG", "Nigeria"],
  ["NO", "Norway"], ["PK", "Pakistan"], ["PE", "Peru"], ["PH", "Philippines"], ["PL", "Poland"], ["PT", "Portugal"],
  ["RO", "Romania"], ["RW", "Rwanda"], ["SA", "Saudi Arabia"], ["SN", "Senegal"], ["RS", "Serbia"],
  ["SG", "Singapore"], ["SK", "Slovakia"], ["SI", "Slovenia"], ["ZA", "South Africa"], ["ES", "Spain"],
  ["LK", "Sri Lanka"], ["SE", "Sweden"], ["CH", "Switzerland"], ["TW", "Taiwan"], ["TZ", "Tanzania"],
  ["TH", "Thailand"], ["TR", "Türkiye"], ["UG", "Uganda"], ["UA", "Ukraine"], ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"], ["US", "United States"], ["UY", "Uruguay"], ["VN", "Vietnam"], ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
].map(([code, name]) => ({ code, name }));

const byCode = new Map(COUNTRIES.map((c) => [c.code, c.name]));
export const countryName = (code: string | null | undefined) => (code ? byCode.get(code) ?? code : "");
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export const CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "NGN", "KES", "GHS", "ZAR", "INR", "JPY", "BRL", "MXN", "SGD",
  "CHF", "SEK", "NOK", "DKK", "PLN", "AED", "PHP", "IDR", "EGP", "UGX", "TZS", "RWF",
];
