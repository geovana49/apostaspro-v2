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
 * 
 * Freebet:  Returns (Stake * FinalOdd). Commission is on total return.
 *           Effective = FinalOdd * (1 - Comm%)
 * 
 * Lay:      Returns Stake (the payout IS the stake). Commission is on stake??
 *           Actually for Lay, we usually use the "Liability" logic in the solver.
 *           But strictly for "Effective Return per Unit Stake":
 *           Lay acts differently. We'll handle Lay math in the solver directly.
 *           For display/consistency, we might return FinalOdd.
 * 
 * Normal:   Returns Stake * FinalOdd. Commission is on PROFIT (Stake * (FinalOdd - 1)).
 *           Net Return = Stake + Stake * (FinalOdd - 1) * (1 - Comm%)
 *           Effective = 1 + (FinalOdd - 1) * (1 - Comm%)
 */
export function getEffectiveOdd(finalOdd: number, commissionPct: number, isFreebet: boolean, isLay: boolean): number {
    const commDec = commissionPct / 100;

    if (isLay) {
        // Lay doesn't standardly fit "effective odd" in the same way for the solver
        // but the reference code uses h.finalOdd for Lay in some places 
        // and (oddLay - commDec) in others for the 'target return' math.
        return finalOdd;
    }

    if (isFreebet) {
        // Commission on total return? Or profit? Reference says:
        // "Freebet: usa effectiveOdd que já considera comissão... profits[idx] = stake * h.effectiveOdd - totalStake"
        // Reference setHouse: h.effectiveOdd = h.finalOdd * (1 - commissionVal / 100);
        return finalOdd * (1 - commDec);
    }

    // Normal Back
    return 1 + (finalOdd - 1) * (1 - commDec);
}

/**
 * Main arbitrage calculation.
 * Solves the system:
 * TotalStake = (FixedContribution + SumParticipating) / (1 - SumInverseZeroing)
 */
export function calculateArb(houses: HouseInput[], roundingStep: number): ArbResult {
    if (houses.length === 0) {
        return { targetReturn: 0, totalInvested: 0, results: [], minProfit: 0, roi: 0, isArb: false };
    }

    // 1. Pre-calculate effective odds and final odds
    const processed = houses.map(h => {
        let finalOdd = h.isFreebet ? Math.max(applyIncrease(h.odd, h.increase) - 1, 0) : applyIncrease(h.odd, h.increase);

        // Correction: The reference logic for freebet finalOdd subtraction happens IN setHouse
        // "h.finalOdd = h.freebet ? Math.max(calculatedOdd - 1, 0) : calculatedOdd;"
        // We match that here.

        let effectiveOdd = 0;
        const commDec = h.commission / 100;

        if (h.isFreebet) {
            effectiveOdd = finalOdd * (1 - commDec);
        } else if (h.isLay) {
            effectiveOdd = finalOdd; // Placeholder, used differently in equations
        } else {
            effectiveOdd = 1 + (finalOdd - 1) * (1 - commDec);
        }

        return { ...h, finalOdd, effectiveOdd };
    });

    // 2. Identify roles
    const fixedIndex = processed.findIndex(h => h.isFixed);
    const anchorIdx = fixedIndex >= 0 ? fixedIndex : 0;
    const anchor = processed[anchorIdx];
    const anchorStake = anchor.stake;

    // 3. Calculate Fixed Net Return (The target profit for all participating houses)
    let fixedNetReturn = 0;
    if (anchor.isFreebet) {
        fixedNetReturn = anchorStake * anchor.effectiveOdd;
    } else if (anchor.isLay) {
        // Formula from reference: fixedNetReturn = fixedStake * (oddLay - commissionDecimal)
        // Wait, reference says: "Retorno alvo = stake * (oddLay - comissão)"
        // This implies we equalise the LIQUIDITY generated?? No...
        // Let's stick to the profit equation.
        // Reference: "fixedNetReturn = fixedStake * (oddLay - commissionDecimal);"
        fixedNetReturn = anchorStake * (anchor.finalOdd - (anchor.commission / 100));
    } else {
        fixedNetReturn = anchorStake * anchor.effectiveOdd;
    }

    // 4. Group houses
    const participatingIds: number[] = [];
    const zeroingIds: number[] = []; // distribution = false

    processed.forEach((h, i) => {
        if (i === anchorIdx) return;
        if (h.finalOdd <= 0) return; // Skip invalid
        if (h.distribution) participatingIds.push(i);
        else zeroingIds.push(i);
    });

    // 5. Solve for TotalStake
    // TotalStake = (FixedContribution + SumParticipatingStakes) / (1 - SumInverseZeroing)

    // A) Sum Inverse Zeroing (Effective Odds inverses)
    let sumInverseZeroing = 0;
    zeroingIds.forEach(i => {
        const h = processed[i];
        if (h.effectiveOdd > 0) sumInverseZeroing += 1 / h.effectiveOdd;
    });

    // B) Calculate hypothetical participating stakes based on fixedNetReturn
    let sumParticipatingStakes = 0; // Contribution to TotalStake equation
    const participatingStakes: Record<number, number> = {};

    participatingIds.forEach(i => {
        const h = processed[i];
        let calcStake = 0;

        if (h.isLay) {
            // Reference: calcStake = fixedNetReturn / (oddLay - commissionDecimal);
            const commDec = h.commission / 100;
            calcStake = fixedNetReturn / (h.finalOdd - commDec);
        } else {
            calcStake = h.effectiveOdd > 0 ? fixedNetReturn / h.effectiveOdd : 0;
        }

        participatingStakes[i] = calcStake;

        // Add to sumParticipatingStakes (Validation: Freebets don't contribute to COST)
        if (!h.isFreebet) {
            if (h.isLay) {
                // Lay cost is LIABILITY = Stake * (Odd - 1)
                sumParticipatingStakes += calcStake * Math.max(h.odd - 1, 0);
            } else {
                sumParticipatingStakes += calcStake;
            }
        }
    });

    // C) Fixed House Contribution
    let fixedContribution = 0;
    if (!anchor.isFreebet) {
        if (anchor.isLay) {
            fixedContribution = anchorStake * (anchor.odd - 1); // Liability
        } else {
            fixedContribution = anchorStake;
        }
    }

    // D) Solve It
    const denominator = 1 - sumInverseZeroing;
    let totalStake = 0;

    if (!anchor.distribution) {
        // Rare case: Anchor itself is "Zerar". 
        // Force totalStake = fixedNetReturn
        totalStake = fixedNetReturn;
        // (Logic for this edge case is complex in reference, simplified here for now:
        //  we assume anchor is usually a participant. If anchor is zerar, profit is 0 everywhere?)
        //  Actually reference handles it by redistributing remaining budget.
        //  Let's skip deep edge case for now and assume anchor is participating.
    } else if (denominator > 0.001) {
        totalStake = (fixedContribution + sumParticipatingStakes) / denominator;
    } else {
        // Fallback if zeroing uses up >100% (impossible arb)
        totalStake = fixedContribution + sumParticipatingStakes;
    }

    // 6. Final Stake Calculation & Results
    // We need to calculate stakes for Zeroing houses using the solved TotalStake
    const finalResults: HouseResult[] = processed.map((h, i) => {
        let stake = 0;

        if (i === anchorIdx) {
            stake = anchor.stake;
        } else if (h.finalOdd <= 0) {
            stake = 0;
        } else if (!h.distribution) {
            // Zeroing house: Stake = TotalStake / EffectiveOdd
            stake = h.effectiveOdd > 0 ? totalStake / h.effectiveOdd : 0;
        } else {
            // Participating: Use pre-calc
            stake = participatingStakes[i] || 0;
        }

        // Rounding (except anchor)
        if (i !== anchorIdx) {
            stake = roundStake(stake, roundingStep);
        }

        // Liability for Lay
        const responsibility = h.isLay ? stake * Math.max(h.odd - 1, 0) : 0;

        // Profit Calculation
        // Reference:
        // Lay: profit = stake * (1 - comm%) - (totalStake - responsibility)
        // Freebet: profit = stake * effectiveOdd - totalStake
        // Back: profit = stake * effectiveOdd - totalStake

        const commDec = h.commission / 100;
        let profitIfWin = 0;

        // Note: totalStake computed above was "Ideal Total Stake". 
        // We must use the ACTUAL rounded total stake for accurate profit display.
        // But profit formula depends on the scenario where THIS house wins.

        // Let's sum up the ACTUAL invested money based on final rounded stakes
        // to get the real "Total Invested" displayed to user.
        return {
            finalOdd: h.finalOdd,
            effectiveOdd: h.effectiveOdd,
            computedStake: stake,
            responsibility,
            profitIfWin: 0, // Will calc after summing total actual investment
            tempIsLay: h.isLay,
            tempCommDec: commDec
        };
    });

    // Calculate actual Total Invested (Real Money)
    const actualTotalInvested = finalResults.reduce((sum, res, i) => {
        const h = processed[i];
        if (h.isFreebet) return sum;
        if (h.isLay) return sum + res.responsibility;
        return sum + res.computedStake;
    }, 0);

    // Calculate detailed profits
    finalResults.forEach((res, i) => {
        const h = processed[i];
        // Profit logic from reference:
        if (h.isLay) {
            res.profitIfWin = res.computedStake * (1 - res.tempCommDec) - (actualTotalInvested - res.responsibility);
        } else {
            res.profitIfWin = (res.computedStake * h.effectiveOdd) - actualTotalInvested;
        }
    });

    const minProfit = finalResults.length > 0 ? Math.min(...finalResults.map(r => r.profitIfWin)) : 0;
    const roi = actualTotalInvested > 0 ? (minProfit / actualTotalInvested) * 100 : 0;

    return {
        targetReturn: fixedNetReturn, // This is approx, strictly targetReturn varies per scenario if rounded
        totalInvested: actualTotalInvested,
        results: finalResults,
        minProfit,
        roi,
        isArb: roi >= 0
    };
}

// --- Helpers ---
export function roundStake(value: number, step: number): number {
    if (step <= 0) return value;
    // Reference uses round, not floor/ceil
    return Math.round(value / step) * step;
}

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
