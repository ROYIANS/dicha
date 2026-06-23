export type DistrictOption = {
  code: string;
  name: string;
};

type ProvinceGroup = Record<string, Array<{ code: string; address: string }>>;
type DistrictMap = Record<string, ProvinceGroup | Record<string, string>>;

let cachedDistricts: DistrictMap | null = null;

export async function loadChineseDistricts(): Promise<DistrictMap> {
  if (cachedDistricts) return cachedDistricts;

  const response = await fetch('/data/chinese-districts.json');
  if (!response.ok) throw new Error(`Failed to load districts: ${response.status}`);

  cachedDistricts = (await response.json()) as DistrictMap;
  return cachedDistricts;
}

export function provinceOptions(districts: DistrictMap): DistrictOption[] {
  const grouped = districts['86'] as ProvinceGroup | undefined;
  if (!grouped) return [];

  return Object.values(grouped)
    .flat()
    .map((item) => ({ code: item.code, name: item.address }));
}

export function childDistrictOptions(districts: DistrictMap, parentCode: string): DistrictOption[] {
  const children = districts[parentCode];
  if (!children || Array.isArray(children)) return [];

  return Object.entries(children as Record<string, string>).map(([code, name]) => ({
    code,
    name: name.trim(),
  }));
}
