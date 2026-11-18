/**
 * Units.
 *
 * Everything inside the app is millimetres. Inches are a display option only.
 * That avoids the classic bug where a chart is designed in one unit and
 * printed in another.
 */

export const MM_PER_INCH = 25.4;

/** Paper sizes in millimetres, portrait. */
export const PAPER_MM = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  auto: { width: 0, height: 0 }
};

export function mmToInch(mm) {
  return mm / MM_PER_INCH;
}

export function inchToMm(inch) {
  return inch * MM_PER_INCH;
}

/** Format a number with the user's locale, without trailing zeros. */
export function formatNumber(value, locale = "de", digits = 1) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

/** Format a length in the chosen unit. */
export function formatLength(mm, unit = "metric", locale = "de") {
  if (unit === "imperial") {
    return `${formatNumber(mmToInch(mm), locale, 2)} in`;
  }
  return `${formatNumber(mm, locale, 1)} mm`;
}

/** Physical size of a chart at the chosen cell size. */
export function chartSizeMm(chart) {
  const cell = chart.options?.cellMm || 6;
  return {
    width: chart.width * cell,
    height: chart.height * cell
  };
}

/**
 * How much a chart must be scaled to fit a paper size with margins.
 * Returns a number <= 1, or 1 when the paper is `auto`.
 */
export function fitToPaper(chart, paper = chart.options?.paper || "A4", marginMm = 12) {
  const size = PAPER_MM[paper] || PAPER_MM.A4;
  if (!size.width || !size.height) return 1;
  const chartSize = chartSizeMm(chart);
  const availableWidth = size.width - marginMm * 2;
  const availableHeight = size.height - marginMm * 2;
  return Math.min(1, availableWidth / chartSize.width, availableHeight / chartSize.height);
}

/** Human-readable paper name, localised later if needed. */
export function paperLabel(paper) {
  return paper === "auto" ? "Auto" : paper;
}
