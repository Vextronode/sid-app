export function publicVillageParams() {
  if (typeof window === 'undefined') return {}

  const villageCode = new URLSearchParams(window.location.search).get('village_code')

  return villageCode ? { village_code: villageCode } : {}
}
