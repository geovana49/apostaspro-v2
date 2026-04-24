import { Bet } from '../types';

export const calculateBetStats = (bet: Bet) => {
    if (!bet || !bet.coverages) {
        return { 
            totalStake: 0, 
            totalReturn: 0, 
            profit: Number(bet?.extraGain || 0), 
            isDoubleGreen: !!bet?.isDoubleGreen, 
            coverageProfits: [] 
        };
    }
    const isFreebetConversion = bet.promotionType?.toLowerCase().includes('conversão freebet');

    const totalStake = bet.coverages.reduce((sum, c, index) => {
        // For freebet conversions, skip the first coverage stake (bonus balance)
        if (isFreebetConversion && index === 0) return sum;
        return sum + Number(c.stake);
    }, 0);

    let totalReturn = 0;
    bet.coverages.forEach((c, index) => {
        const statusLower = (c.status || '').toLowerCase();
        if (statusLower === 'red') {
            totalReturn += 0;
        } else if (c.manualReturn !== undefined && c.manualReturn !== null && c.manualReturn !== 0) {
            totalReturn += Number(c.manualReturn);
        } else {
            let returnValue = 0;
            if (statusLower === 'green' || statusLower === 'concluído' || statusLower === 'concluido') returnValue = (c.stake * c.odd);
            else if (statusLower === 'anulada' || statusLower === 'cashout' || statusLower === 'cancelada') returnValue = c.stake;
            else if (statusLower === 'meio green') returnValue = (c.stake * c.odd) / 2 + (c.stake / 2);
            else if (statusLower === 'meio red') returnValue = (c.stake / 2);

            // For freebet conversions, subtract stake from first coverage return (you don't get the stake back)
            // Only apply if it's an auto-calculated return (manualReturn check handled above)
            if (isFreebetConversion && index === 0 && returnValue > 0) {
                returnValue -= c.stake;
            }

            totalReturn += returnValue;
        }
    });

    let profit = totalReturn - totalStake;

    // Add extra gain/loss if specified
    if (bet.extraGain !== undefined && bet.extraGain !== null) {
        profit += bet.extraGain;
    }

    // Debug: Log multi-green bets
    if (bet.coverages.filter(c => (c.status || '').toLowerCase() === 'green').length > 1) {
        console.log('🎯 Multi-Green Bet:', {
            event: bet.event,
            coverages: bet.coverages.map(c => ({
                stake: c.stake,
                odd: c.odd,
                status: c.status,
                manualReturn: c.manualReturn,
                autoReturn: (c.status || '').toLowerCase() === 'green' ? (c.stake * c.odd) : 0
            })),
            totalStake,
            totalReturn,
            extraGain: bet.extraGain,
            profit
        });
    }

    const greenMarkets = bet.coverages
        .filter(c => {
            const s = (c.status || '').toLowerCase();
            return s === 'green' || s === 'meio green' || s === 'concluído' || s === 'concluido';
        })
        .map(c => (c.market || '').trim().toLowerCase()); // Normalize market names

    // Count unique winning markets
    const uniqueGreenMarkets = new Set(greenMarkets);
    const isDoubleGreen = !!bet.isDoubleGreen || uniqueGreenMarkets.size >= 2;

    const coverageProfits = bet.coverages.map((c, index) => {
        let returnValue = 0;
        const statusLower = (c.status || '').toLowerCase();

        if (statusLower === 'red') {
            returnValue = 0;
        } else if (c.manualReturn !== undefined && c.manualReturn !== null && c.manualReturn !== 0) {
            returnValue = Number(c.manualReturn);
        } else {
            if (statusLower === 'green' || statusLower === 'concluído' || statusLower === 'concluido') returnValue = (c.stake * c.odd);
            else if (statusLower === 'anulada' || statusLower === 'cashout' || statusLower === 'cancelada') returnValue = c.stake;
            else if (statusLower === 'meio green') returnValue = (c.stake * c.odd) / 2 + (c.stake / 2);
            else if (statusLower === 'meio red') returnValue = (c.stake / 2);
        }

        // Apply Freebet conversion logic to individual coverage return
        if (isFreebetConversion && index === 0) {
            // For first coverage in freebet conversion, stake is not returned (it was free)
            // But visually/logically we subtract the 'stake' value from return to get net real money gain
            // Wait, standard logic: Return includes stake. Net = Return - Stake.
            // If Freebet: Stake is 0 (cost). Return is (Stake*Odd). Net = Stake*Odd.
            // But usually we enter 'Stake' as the freebet value.
            // Logic at line 27: if (returnValue > 0) returnValue -= c.stake;
            // This effectively removes the stake from the return amount.
            // So if Stake 100, Odd 2. Return 200. Logic -> Return 100.
            // Net Profit = Return (100) - Stake (0 in calculation logic line 8).
            // Line 8: if(isFreebetConversion && index===0) return sum; (skips adding to totalStake).
            // So TotalStake = 0.
            // Line 27: returnValue -= c.stake. Return becomes 100.
            // Profit = 100 - 0 = 100. Correct.
            if (returnValue > 0) {
                returnValue -= c.stake;
            }
        }

        // Per coverage profit is Return - Stake.
        // BUT for Freebet first coverage, Stake is effectively "paid by house".
        // In calculating `totalStake`, we skipped it.
        // Here, to get correct per-coverage profit relative to USER money:
        // Coverage 1 (Freebet): Cost 0. Return 100. Profit +100.
        // Formula: ReturnValue (adjusted) - RealCost.
        // RealCost = (isFreebetConversion && index === 0) ? 0 : c.stake;
        const realCost = (isFreebetConversion && index === 0) ? 0 : c.stake;
        return {
            bookmakerId: c.bookmakerId,
            profit: returnValue - realCost
        };
    });

    return { totalStake, totalReturn, profit, isDoubleGreen, coverageProfits };
};
