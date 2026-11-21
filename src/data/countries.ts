import type { Country } from "@/lib/types";

type Row = [code: string, name: string, capital: string, currency: string, languages: string, region: string];

const ROWS: Row[] = [
  ["FR", "France", "Paris", "EUR", "French", "Europe"],
  ["GB", "United Kingdom", "London", "GBP", "English", "Europe"],
  ["IT", "Italy", "Rome", "EUR", "Italian", "Europe"],
  ["ES", "Spain", "Madrid", "EUR", "Spanish", "Europe"],
  ["NL", "Netherlands", "Amsterdam", "EUR", "Dutch", "Europe"],
  ["DE", "Germany", "Berlin", "EUR", "German", "Europe"],
  ["CZ", "Czechia", "Prague", "CZK", "Czech", "Europe"],
  ["AT", "Austria", "Vienna", "EUR", "German", "Europe"],
  ["PT", "Portugal", "Lisbon", "EUR", "Portuguese", "Europe"],
  ["GR", "Greece", "Athens", "EUR", "Greek", "Europe"],
  ["TR", "Turkey", "Ankara", "TRY", "Turkish", "Europe / Asia"],
  ["IS", "Iceland", "Reykjavík", "ISK", "Icelandic", "Europe"],
  ["RU", "Russia", "Moscow", "RUB", "Russian", "Europe / Asia"],
  ["GE", "Georgia", "Tbilisi", "GEL", "Georgian", "Asia"],
  ["CH", "Switzerland", "Bern", "CHF", "German, French, Italian, Romansh", "Europe"],
  ["SI", "Slovenia", "Ljubljana", "EUR", "Slovene", "Europe"],
  ["HR", "Croatia", "Zagreb", "EUR", "Croatian", "Europe"],
  ["NO", "Norway", "Oslo", "NOK", "Norwegian", "Europe"],
  ["FI", "Finland", "Helsinki", "EUR", "Finnish, Swedish", "Europe"],
  ["US", "United States of America", "Washington, D.C.", "USD", "English", "North America"],
  ["CA", "Canada", "Ottawa", "CAD", "English, French", "North America"],
  ["MX", "Mexico", "Mexico City", "MXN", "Spanish", "North America"],
  ["CU", "Cuba", "Havana", "CUP", "Spanish", "Caribbean"],
  ["DO", "Dominican Republic", "Santo Domingo", "DOP", "Spanish", "Caribbean"],
  ["BR", "Brazil", "Brasília", "BRL", "Portuguese", "South America"],
  ["AR", "Argentina", "Buenos Aires", "ARS", "Spanish", "South America"],
  ["PE", "Peru", "Lima", "PEN", "Spanish, Quechua, Aymara", "South America"],
  ["CO", "Colombia", "Bogotá", "COP", "Spanish", "South America"],
  ["EC", "Ecuador", "Quito", "USD", "Spanish", "South America"],
  ["BO", "Bolivia", "Sucre", "BOB", "Spanish, Quechua, Aymara", "South America"],
  ["CL", "Chile", "Santiago", "CLP", "Spanish", "South America"],
  ["JP", "Japan", "Tokyo", "JPY", "Japanese", "Asia"],
  ["KR", "South Korea", "Seoul", "KRW", "Korean", "Asia"],
  ["CN", "China", "Beijing", "CNY", "Mandarin Chinese", "Asia"],
  ["SG", "Singapore", "Singapore", "SGD", "English, Malay, Mandarin, Tamil", "Asia"],
  ["TH", "Thailand", "Bangkok", "THB", "Thai", "Asia"],
  ["VN", "Vietnam", "Hanoi", "VND", "Vietnamese", "Asia"],
  ["MY", "Malaysia", "Kuala Lumpur", "MYR", "Malay", "Asia"],
  ["KH", "Cambodia", "Phnom Penh", "KHR", "Khmer", "Asia"],
  ["PH", "Philippines", "Manila", "PHP", "Filipino, English", "Asia"],
  ["ID", "Indonesia", "Jakarta", "IDR", "Indonesian", "Asia"],
  ["AE", "United Arab Emirates", "Abu Dhabi", "AED", "Arabic", "Middle East"],
  ["JO", "Jordan", "Amman", "JOD", "Arabic", "Middle East"],
  ["PK", "Pakistan", "Islamabad", "PKR", "Urdu, English", "Asia"],
  ["IN", "India", "New Delhi", "INR", "Hindi, English", "Asia"],
  ["NP", "Nepal", "Kathmandu", "NPR", "Nepali", "Asia"],
  ["BT", "Bhutan", "Thimphu", "BTN", "Dzongkha", "Asia"],
  ["LK", "Sri Lanka", "Sri Jayawardenepura Kotte", "LKR", "Sinhala, Tamil", "Asia"],
  ["MV", "Maldives", "Malé", "MVR", "Dhivehi", "Asia"],
  ["MA", "Morocco", "Rabat", "MAD", "Arabic, Berber", "Africa"],
  ["EG", "Egypt", "Cairo", "EGP", "Arabic", "Africa"],
  ["ZA", "South Africa", "Pretoria", "ZAR", "11 official languages", "Africa"],
  ["KE", "Kenya", "Nairobi", "KES", "Swahili, English", "Africa"],
  ["TZ", "Tanzania", "Dodoma", "TZS", "Swahili, English", "Africa"],
  ["ZW", "Zimbabwe", "Harare", "USD", "English, Shona, Ndebele", "Africa"],
  ["BW", "Botswana", "Gaborone", "BWP", "English, Setswana", "Africa"],
  ["NA", "Namibia", "Windhoek", "NAD", "English", "Africa"],
  ["SC", "Seychelles", "Victoria", "SCR", "Seychellois Creole, English, French", "Africa"],
  ["MG", "Madagascar", "Antananarivo", "MGA", "Malagasy, French", "Africa"],
  ["AU", "Australia", "Canberra", "AUD", "English", "Oceania"],
  ["NZ", "New Zealand", "Wellington", "NZD", "English, Māori", "Oceania"],
  ["FJ", "Fiji", "Suva", "FJD", "English, Fijian, Hindi", "Oceania"],
  ["PF", "French Polynesia", "Papeete", "XPF", "French, Tahitian", "Oceania"],
];

export const COUNTRIES: Record<string, Country> = Object.fromEntries(
  ROWS.map(([code, name, capital, currency, languages, region]) => [
    code,
    { code, name, capital, currency, languages: languages.split(", "), region },
  ]),
);

export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Wikipedia article title for a country name, where the plain name is ambiguous. */
export function countryWikiTitle(name: string): string {
  return name === "Georgia" ? "Georgia (country)" : name;
}
