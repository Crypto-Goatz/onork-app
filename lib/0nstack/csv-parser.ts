/**
 * 0nStack CSV Parser
 * Parses CSV buffers with auto-detection of delimiter, quoted fields,
 * and automatic column identification for email/domain fields.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  delimiter: string
  emailColumn: string | null
  domainColumn: string | null
  detectedColumns: {
    email: string | null
    domain: string | null
    name: string | null
    company: string | null
    phone: string | null
    website: string | null
  }
}

// ---------------------------------------------------------------------------
// Delimiter detection
// ---------------------------------------------------------------------------

const DELIMITERS = [',', '\t', '|', ';'] as const

function detectDelimiter(firstLines: string[]): string {
  const counts: Record<string, number[]> = {}

  for (const delim of DELIMITERS) {
    counts[delim] = firstLines.map(
      (line) => line.split(delim).length - 1
    )
  }

  // Best delimiter: consistent count across lines, highest count
  let bestDelim = ','
  let bestScore = 0

  for (const delim of DELIMITERS) {
    const c = counts[delim]
    if (c.length === 0 || c[0] === 0) continue

    // Check consistency (stddev should be low)
    const avg = c.reduce((s, v) => s + v, 0) / c.length
    const variance =
      c.reduce((s, v) => s + (v - avg) ** 2, 0) / c.length
    const stddev = Math.sqrt(variance)

    // Score: high average count + low variance
    const score = avg * 10 - stddev * 5
    if (score > bestScore) {
      bestScore = score
      bestDelim = delim
    }
  }

  return bestDelim
}

// ---------------------------------------------------------------------------
// Field parser (handles quoted fields with escaped quotes)
// ---------------------------------------------------------------------------

function parseFields(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      current += char
      i++
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      }
      if (char === delimiter) {
        fields.push(current.trim())
        current = ''
        i++
        continue
      }
      current += char
      i++
    }
  }

  // Push the last field
  fields.push(current.trim())
  return fields
}

// ---------------------------------------------------------------------------
// Column auto-detection
// ---------------------------------------------------------------------------

const EMAIL_COLUMN_PATTERNS = [
  /^e[-_]?mail$/i,
  /^email[-_]?addr/i,
  /^contact[-_]?email/i,
  /^primary[-_]?email/i,
  /^work[-_]?email/i,
  /^email[-_]?address/i,
]

const DOMAIN_COLUMN_PATTERNS = [
  /^domain$/i,
  /^website$/i,
  /^web[-_]?site$/i,
  /^url$/i,
  /^company[-_]?domain/i,
  /^company[-_]?url/i,
  /^homepage/i,
  /^site$/i,
]

const NAME_COLUMN_PATTERNS = [
  /^(full[-_]?)?name$/i,
  /^contact[-_]?name/i,
  /^first[-_]?name$/i,
  /^(display|given)[-_]?name$/i,
]

const COMPANY_COLUMN_PATTERNS = [
  /^company$/i,
  /^organization$/i,
  /^org$/i,
  /^business[-_]?name$/i,
  /^company[-_]?name$/i,
  /^account$/i,
]

const PHONE_COLUMN_PATTERNS = [
  /^phone$/i,
  /^tel$/i,
  /^telephone$/i,
  /^mobile$/i,
  /^cell$/i,
  /^phone[-_]?number/i,
  /^contact[-_]?phone/i,
]

const WEBSITE_COLUMN_PATTERNS = [
  /^website$/i,
  /^web[-_]?site$/i,
  /^url$/i,
  /^homepage$/i,
  /^site[-_]?url$/i,
]

function findColumn(
  headers: string[],
  patterns: RegExp[]
): string | null {
  for (const header of headers) {
    for (const pattern of patterns) {
      if (pattern.test(header)) {
        return header
      }
    }
  }
  return null
}

/**
 * Fallback: scan first few rows looking for a column that contains
 * email-like values.
 */
function findEmailColumnByContent(
  headers: string[],
  rows: Record<string, string>[],
): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sampleRows = rows.slice(0, 10)

  for (const header of headers) {
    let emailCount = 0
    for (const row of sampleRows) {
      if (emailRegex.test(row[header] ?? '')) {
        emailCount++
      }
    }
    // If >50% of sampled rows have email-like values, use this column
    if (emailCount > sampleRows.length * 0.5) {
      return header
    }
  }

  return null
}

/**
 * Fallback: scan for domain-like values if no header matched.
 */
function findDomainColumnByContent(
  headers: string[],
  rows: Record<string, string>[],
): string | null {
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}$/i
  const sampleRows = rows.slice(0, 10)

  for (const header of headers) {
    let domainCount = 0
    for (const row of sampleRows) {
      const val = (row[header] ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
      if (domainRegex.test(val)) {
        domainCount++
      }
    }
    if (domainCount > sampleRows.length * 0.5) {
      return header
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV buffer (string or Buffer) into structured data.
 * Auto-detects delimiter, handles quoted fields, identifies key columns.
 */
export function parseCSVBuffer(input: string | Buffer): ParsedCSV {
  const text =
    typeof input === 'string' ? input : input.toString('utf-8')

  // Normalize line endings
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      delimiter: ',',
      emailColumn: null,
      domainColumn: null,
      detectedColumns: {
        email: null,
        domain: null,
        name: null,
        company: null,
        phone: null,
        website: null,
      },
    }
  }

  // Detect delimiter from first 5 lines
  const sampleLines = lines.slice(0, Math.min(5, lines.length))
  const delimiter = detectDelimiter(sampleLines)

  // Parse header row
  const headers = parseFields(lines[0], delimiter)

  // Parse data rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseFields(lines[i], delimiter)
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? ''
    }
    rows.push(row)
  }

  // Detect key columns by header name
  let emailColumn = findColumn(headers, EMAIL_COLUMN_PATTERNS)
  let domainColumn = findColumn(headers, DOMAIN_COLUMN_PATTERNS)
  const nameColumn = findColumn(headers, NAME_COLUMN_PATTERNS)
  const companyColumn = findColumn(headers, COMPANY_COLUMN_PATTERNS)
  const phoneColumn = findColumn(headers, PHONE_COLUMN_PATTERNS)
  const websiteColumn = findColumn(headers, WEBSITE_COLUMN_PATTERNS)

  // Fallback: scan content if headers did not match
  if (!emailColumn) {
    emailColumn = findEmailColumnByContent(headers, rows)
  }
  if (!domainColumn) {
    domainColumn = findDomainColumnByContent(headers, rows)
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    delimiter,
    emailColumn,
    domainColumn,
    detectedColumns: {
      email: emailColumn,
      domain: domainColumn,
      name: nameColumn,
      company: companyColumn,
      phone: phoneColumn,
      website: websiteColumn,
    },
  }
}
