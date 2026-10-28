// Helper to parse series and episode metadata from shoot descriptions
export interface ParsedSeriesInfo {
  isSeries: boolean
  seriesTitle: string | null
  episodeNumber: string | null
  cleanDescription: string
}

export function parseSeriesInfo(description?: string | null): ParsedSeriesInfo {
  if (!description) {
    return { isSeries: false, seriesTitle: null, episodeNumber: null, cleanDescription: '' }
  }
  const match = description.match(/^\[Series:\s*([^|\]]+)(?:\s*\|\s*(?:Ep|Episode|Episodes):\s*([^\]]+))?\]\s*\n*/i)
  if (!match) {
    return { isSeries: false, seriesTitle: null, episodeNumber: null, cleanDescription: description }
  }
  return {
    isSeries: true,
    seriesTitle: match[1]?.trim() || null,
    episodeNumber: match[2]?.trim() || null,
    cleanDescription: description.replace(match[0], '').trim(),
  }
}
