// utils/arbCalc.ts — ARB PRO Arbitrage Calculator Pure Logic
// Based on sharkgreen.com.br ArbiPro logic

export interface HouseInput {
    odd: number;
    stake: number;
    commission: number;   // percentage, e.g. 2.8 means 2.8%
    increase: number;     // odd increase percentage (e.g. 20%)
    isFreebet: boolean;   // stake is a freebet (not real money invested)
    isLay: boolean;       // is a LAY bet
    isFixed: boolean;     // stake is locked; others recalculate around this one
    distribution: boolean;// if false ("Zerar"), this house gets 0 profit (just covers stake)
    targetProfit?: number | null; // specific profit target if distribution is "fixed profit"
}

export interface HouseResult {
    finalOdd: number;       // odd after increase (Boost)
    effectiveOdd: number;   // odd effectively used for calc (includes commission)
    computedStake: number;  // calculated stake
    responsibility: number; // for Layer bets
    profitIfWin: number;    // net profit if this house's selection wins
}

export interface ArbResult {
    targetReturn: number;         // the equal return across all outcomes
    totalInvested: number;        // sum of real-money stakes
    results: HouseResult[];
    minProfit: number;            // worst-case profit (usually equal across all)
    roi: number;                 // minProfit / totalInvested * 100
    conversion?: number;         // minProfit / FreebetStake * 100 (for Freebet bonus ROI)
    isArb: boolean;               // true if ROI >= 0
}

/**
 * Apply odd increase (Boost).
 * FinalOdd = Odd + (Odd - 1) * (Increase%)
 */
export function applyIncrease(odd: number, increasePct: number): number {
    if (increasePct <= 0 || odd <= 1) return odd;
    return odd + (odd - 1) * (increasePct / 100);
}

/**
 * Calculate effective odd based on bet type and commission.
 */
export function getEffectiveOdd(finalOdd: number, commissionPct: number, isFreebet: boolean, isLay: boolean): number {
    const commDec = commissionPct / 100;

    if (isLay) {
        return finalOdd;
    }

    if (isFreebet) {
        return finalOdd * (1 - commDec);
    }

    // Normal Back
    return 1 + (finalOdd - 1) * (1 - commDec);
}

/**
 * Main arbitrage calculation.
 * Solves the system:
 * TotalStake = (FixedContribution + SumParticipating + SumProfitOffsets) / (1 - SumInverseFixedProfit)
 */
export function calculateArb(houses: HouseInput[], roundingStep: number): ArbResult {
    if (houses.length === 0) {
        return { targetReturn: 0, totalInvested: 0, results: [], minProfit: 0, roi: 0, isArb: false };
    }

    // 1. Pre-calculate effective odds and final odds
    const processed = houses.map(h => {
        let finalOdd = Math.max(applyIncrease(h.odd, h.increase), 0);

        // Handle freebet odd adjustment internally for equations
        const internalFinalOdd = h.isFreebet ? Math.max(finalOdd - 1, 0) : finalOdd;

        let effectiveOdd = 0;
        const commDec = h.commission / 100;

        if (h.isFreebet) {
            effectiveOdd = internalFinalOdd * (1 - commDec);
        } else if (h.isLay) {
            // Correct effective odd for Lay: Return = Stake * (Odd - Commission)
            effectiveOdd = internalFinalOdd - commDec;
        } else {
            effectiveOdd = 1 + (internalFinalOdd - 1) * (1 - commDec);
        }

        return { ...h, finalOdd: internalFinalOdd, displayFinalOdd: finalOdd, effectiveOdd };
    });

    // 2. Identify roles
    const fixedIndex = processed.findIndex(h => h.isFixed);
    const anchorIdx = fixedIndex >= 0 ? fixedIndex : 0;
    const anchor = processed[anchorIdx];
    const anchorStake = anchor.stake;

    // 3. Calculate Fixed Net Return (Profit target for participating houses)
    let fixedNetReturn = 0;
    if (anchor.isFreebet) {
        fixedNetReturn = anchorStake * anchor.effectiveOdd;
    } else if (anchor.isLay) {
        // If Lay wins, we win the backer's stake minus commission
        fixedNetReturn = anchorStake * (1 - (anchor.commission / 100));
    } else {
        fixedNetReturn = anchorStake * anchor.effectiveOdd;
    }

    // 4. Group houses
    const participatingIds: number[] = [];
    const fixedProfitIds: number[] = []; // houses with distribution = false OR specific targetProfit

    processed.forEach((h, i) => {
        if (i === anchorIdx) return;
        if (h.displayFinalOdd <= 0) return;

        // If distribution is false, it's a fixed profit house (usually 0 profit)
        // If targetProfit is set, it's also a fixed profit house
        if (!h.distribution || (h.targetProfit !== null && h.targetProfit !== undefined)) {
            fixedProfitIds.push(i);
        } else {
            participatingIds.push(i);
        }
    });

    // 5. Solve for TotalStake
    // TotalStake = (FixedContribution + SumParticipatingStakes + SumProfitOffsets) / (1 - SumInverses)

    // A) Sum Inverses and Profit Offsets for Fixed Profit Houses
    let sumInverses = 0;
    let sumProfitOffsets = 0;
    fixedProfitIds.forEach(i => {
        const h = processed[i];
        if (h.effectiveOdd > 0) {
            const p = h.targetProfit || 0; // Zerar is p=0
            sumInverses += (1 / h.effectiveOdd);
            sumProfitOffsets += (p / h.effectiveOdd);
        }
    });

    // B) Calculate participating stakes contribution
    let sumParticipatingStakes = 0;
    const participatingStakes: Record<number, number> = {};

    participatingIds.forEach(i => {
        const h = processed[i];
        let calcStake = h.effectiveOdd > 0 ? fixedNetReturn / h.effectiveOdd : 0;

        participatingStakes[i] = calcStake;

        if (!h.isFreebet) {
            if (h.isLay) {
                sumParticipatingStakes += calcStake * Math.max(h.odd - 1, 0);
            } else {
                sumParticipatingStakes += calcStake;
            }
        }
    });

    // C) Anchor Contribution
    let fixedContribution = 0;
    if (!anchor.isFreebet) {
        if (anchor.isLay) {
            fixedContribution = anchorStake * Math.max(anchor.odd - 1, 0);
        } else {
            fixedContribution = anchorStake;
        }
    }

    // D) Solve for TotalStake
    const denominator = 1 - sumInverses;
    let totalStakeTotal = 0;

    if (denominator > 0.001) {
        totalStakeTotal = (fixedContribution + sumParticipatingStakes + sumProfitOffsets) / denominator;
    } else {
        totalStakeTotal = fixedContribution + sumParticipatingStakes + sumProfitOffsets;
    }

    // 6. Final Stake Calculation
    const finalResults: HouseResult[] = processed.map((h, i) => {
        let stake = 0;

        if (i === anchorIdx) {
            stake = anchor.stake;
        } else if (h.displayFinalOdd <= 0) {
            stake = 0;
        } else if (!h.distribution || (h.targetProfit !== null && h.targetProfit !== undefined)) {
            // Fixed Profit: Stake = (TotalStake + Profit) / EffectiveOdd
            const p = h.targetProfit || 0;
            stake = h.effectiveOdd > 0 ? (totalStakeTotal + p) / h.effectiveOdd : 0;
        } else {
            stake = participatingStakes[i] || 0;
        }

        if (i !== anchorIdx) {
            stake = roundStake(stake, roundingStep);
        }

        const responsibility = h.isLay ? stake * Math.max(h.odd - 1, 0) : 0;

        return {
            finalOdd: h.displayFinalOdd,
            effectiveOdd: h.effectiveOdd,
            computedStake: stake,
            responsibility,
            profitIfWin: 0,
            tempIsLay: h.isLay,
            tempCommDec: h.commission / 100
        };
    });

    // Actual Invested Sum
    const actualTotalInvested = finalResults.reduce((sum, res, i) => {
        const h = processed[i];
        if (h.isFreebet) return sum;
        if (h.isLay) return sum + res.responsibility;
        return sum + res.computedStake;
    }, 0);

    // Actual Profits
    finalResults.forEach((res, i) => {
        const h = processed[i];
        if (h.isLay) {
            res.profitIfWin = res.computedStake * (1 - res.tempCommDec) - (actualTotalInvested - res.responsibility);
        } else {
            res.profitIfWin = (res.computedStake * h.effectiveOdd) - actualTotalInvested;
        }
    });

    const minProfit = finalResults.length > 0 ? Math.min(...finalResults.map(r => r.profitIfWin)) : 0;
    const roi = actualTotalInvested > 0 ? (minProfit / actualTotalInvested) * 100 : 0;

    // Calculate conversion rate if there is at least one Freebet
    let conversion: number | undefined = undefined;
    const freebetHouse = houses.find(h => h.isFreebet && h.stake > 0);
    if (freebetHouse) {
        conversion = (minProfit / freebetHouse.stake) * 100;
    }

    return {
        targetReturn: fixedNetReturn,
        totalInvested: actualTotalInvested,
        results: finalResults,
        minProfit,
        roi,
        conversion,
        isArb: roi >= 0
    };
}

// --- Helpers ---
export function roundStake(value: number, step: number): number {
    if (step <= 0) return value;
    return Math.round(value / step) * step;
}

export function parseBR(val: string): number {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
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
