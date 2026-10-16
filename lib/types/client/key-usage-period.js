const DAY = 86_400_000;
const stamp = (date) => date.toISOString().slice(0, 10);
/** Desk days are China calendar days, independent of the browser's timezone. */
export function periodRange(period, now) {
    const date = new Date(now + 8 * 3_600_000);
    const today = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const monday = new Date(+today - ((today.getUTCDay() + 6) % 7) * DAY);
    switch (period) {
        case 'thisWeek': return { start: stamp(monday), end: stamp(today) };
        case 'lastWeek': return { start: stamp(new Date(+monday - 7 * DAY)), end: stamp(new Date(+monday - DAY)) };
        case 'thisMonth': return { start: stamp(month), end: stamp(today) };
        case 'lastMonth': return { start: stamp(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))), end: stamp(new Date(+month - DAY)) };
        case 'last30': return { start: stamp(new Date(+today - 29 * DAY)), end: stamp(today) };
    }
}
const tokenKeys = ['inputTokens', 'outputTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens', 'totalTokens'];
const callKeys = ['calls', 'successCalls', 'failedCalls', 'streamCalls'];
export function sumUsage(rows) {
    const result = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0 };
    for (const key of tokenKeys)
        for (const row of rows)
            result[key] += row[key];
    for (const key of callKeys) {
        if (rows.length > 0 && rows.every(row => row[key] !== undefined)) {
            result[key] = rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
        }
    }
    return result;
}
/** Missing detail stays unknown; bounds describe the API window, not first activity. */
export function sliceUsage(usage, range) {
    const empty = { totals: undefined, models: [], daily: [], coverage: 'unavailable' };
    if (!usage)
        return empty;
    const inside = (date) => date >= range.start && date <= range.end;
    const points = usage.points.filter(point => inside(point.date));
    const covered = usage.startDate !== undefined && usage.endDate !== undefined
        && usage.startDate <= range.start && usage.endDate >= range.end;
    const overlaps = usage.startDate !== undefined && usage.endDate !== undefined
        && usage.startDate <= range.end && usage.endDate >= range.start;
    if (!overlaps && points.length === 0)
        return empty;
    const exactWindow = usage.startDate === range.start && usage.endDate === range.end;
    // Aggregates-only responses can support daily totals, but cannot attribute a subrange to models.
    const detailKnown = usage.points.length > 0 || usage.window?.totalTokens === 0;
    const daily = detailKnown
        ? [...new Set(points.map(point => point.date))].sort().map(date => ({ date, ...sumUsage(points.filter(point => point.date === date)) }))
        : usage.daily.filter(day => inside(day.date));
    const models = detailKnown
        ? [...new Set(points.map(point => point.model))].map(model => ({ model, ...sumUsage(points.filter(point => point.model === model)) })).sort((a, b) => b.totalTokens - a.totalTokens)
        : exactWindow ? [...usage.models] : [];
    const totals = detailKnown ? sumUsage(points) : daily.length > 0 ? sumUsage(daily) : exactWindow ? usage.window : undefined;
    return { totals, models, daily, coverage: totals === undefined ? 'unavailable' : covered ? 'complete' : 'partial' };
}
//# sourceMappingURL=key-usage-period.js.map