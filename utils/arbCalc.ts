// utils/arbCalc.ts — ARB PRO Arbitrage Calculator Pure Logic

export interface HouseInput {
    odd: number;
    stake: number;
    commission: number;   // percentage, e.g. 2.8 means 2.8%
    isFreebet: boolean;   // stake is a freebet (not real money invested)
    isFixed: boolean;     // stake is locked; others recalculate around this one
    isZero: boolean;      // zero this house in the split (don't back here)
}

export interface HouseResult {
    finalOdd: number;       // odd after commission
    computedStake: number;  // calculated stake
    responsibility: number; // what you pay if this house wins and others lose
    profitIfWin: number;    // net profit if this house's selection wins
}

export interface ArbResult {
    targetReturn: number;         // the equal return across all outcomes
    totalInvested: number;        // sum of real-money stakes
    results: HouseResult[];
    minProfit: number;            // worst-case profit (usually equal across all)
    roi: number;                 // minProfit / totalInvested * 100
    isArb: boolean;               // true if ROI >= 0
}

/**
 * Apply commission to an odd.
 * FinalOdd = 1 + (Odd - 1) * (1 - commission/100)
 */
export function applyCommission(odd: number, commissionPct: number): number {
    if (commissionPct <= 0) return odd;
    return 1 + (odd - 1) * (1 - commissionPct / 100);
}

/**
 * The "effective return power" of a house.
 * For a normal bet: stake * finalOdd
 * For a freebet:    stake * (finalOdd - 1)   [stake is not returned on win]
 */
export function effectiveReturn(stake: number, finalOdd: number, isFreebet: boolean): number {
    return isFreebet ? stake * (finalOdd - 1) : stake * finalOdd;
}

/**
 * The stake needed to match a target return R for a given house.
 * Normal:   stake = R / finalOdd
 * Freebet:  stake = R / (finalOdd - 1)
 */
export function stakeForReturn(targetReturn: number, finalOdd: number, isFreebet: boolean): number {
    const divisor = isFreebet ? finalOdd - 1 : finalOdd;
    if (divisor <= 0) return 0;
    return targetReturn / divisor;
}

/**
 * Round a value to the given rounding step (e.g. 0.01, 1.00, 5.00).
 */
export function roundStake(value: number, step: number): number {
    if (step <= 0) return value;
    return Math.round(value / step) * step;
}

/**
 * Main arbitrage calculation.
 *
 * Finds the house whose stake is fixed, computes target return,
 * then computes stakes for all other houses to equalise the return.
 * Returns full result including profits per scenario and ROI.
 */
export function calculateArb(houses: HouseInput[], roundingStep: number): ArbResult {
    if (houses.length === 0) {
        return { targetReturn: 0, totalInvested: 0, results: [], minProfit: 0, roi: 0, isArb: false };
    }

    // Compute final odds (post-commission)
    const finalOdds = houses.map(h => applyCommission(h.odd, h.commission));

    // Find the fixed house (anchor). Default to first house.
    const fixedIndex = houses.findIndex(h => h.isFixed);
    const anchorIndex = fixedIndex >= 0 ? fixedIndex : 0;
    const anchor = houses[anchorIndex];
    const anchorFinalOdd = finalOdds[anchorIndex];

    // Target return based on anchor stake
    const targetReturn = effectiveReturn(anchor.stake, anchorFinalOdd, anchor.isFreebet);

    // Compute stakes for every house
    const computedStakes = houses.map((h, i) => {
        if (i === anchorIndex) return anchor.stake;
        if (h.isZero) return 0;
        const raw = stakeForReturn(targetReturn, finalOdds[i], h.isFreebet);
        return roundStake(raw, roundingStep);
    });

    // Total invested = sum of stakes that are NOT freebets (freebets cost R$0)
    const totalInvested = computedStakes.reduce((sum, s, i) => {
        return sum + (houses[i].isFreebet ? 0 : s);
    }, 0);

    // For each house winning scenario, profit = return - (all other non-freebet stakes)
    const results: HouseResult[] = houses.map((h, i) => {
        const finalOdd = finalOdds[i];
        const stake = computedStakes[i];
        const winReturn = effectiveReturn(stake, finalOdd, h.isFreebet);

        // Responsibility: amount put at risk for the OTHER houses if this one wins
        // (i.e., what you lose from the other non-freebet bets)
        const responsibility = computedStakes.reduce((sum, s, j) => {
            if (j === i) return sum;
            return sum + (houses[j].isFreebet ? 0 : s);
        }, 0);

        const profitIfWin = winReturn - responsibility - (h.isFreebet ? 0 : stake);
        // Simplified: profitIfWin = targetReturn - totalInvested (should be equal across all if fully hedged)

        return {
            finalOdd,
            computedStake: stake,
            responsibility,
            profitIfWin: targetReturn - totalInvested,
        };
    });

    const minProfit = targetReturn - totalInvested;
    const roi = totalInvested > 0 ? (minProfit / totalInvested) * 100 : 0;

    return {
        targetReturn,
        totalInvested,
        results,
        minProfit,
        roi,
        isArb: roi >= 0,
    };
}

// --- Formatting helpers ---
export function parseBR(val: string): number {
    if (!val) return 0;
    const cleaned = val.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

export function formatBRL(val: number): string {
    return val.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatOdd(val: number): string {
    return val.toFixed(2);
}
