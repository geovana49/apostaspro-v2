import { Bet } from '../types';

export const calculateBetStats = (bet: Bet) => {
    const isFreebetConversion = bet.promotionType?.toLowerCase().includes('conversão freebet');

    const totalStake = bet.coverages.reduce((sum, c, index) => {
        // For freebet conversions, skip the first coverage stake (bonus balance)
        if (isFreebetConversion && index === 0) return sum;
        return sum + Number(c.stake);
    }, 0);

    let totalReturn = 0;
    bet.coverages.forEach((c, index) => {
        if (c.manualReturn !== undefined && c.manualReturn !== null && c.manualReturn !== 0) {
            totalReturn += Number(c.manualReturn);
        } else if (c.status === 'Red') {
            totalReturn += 0;
        } else {
            let returnValue = 0;
            if (c.status === 'Green') returnValue = (c.stake * c.odd);
            else if (c.status === 'Anulada' || c.status === 'Cashout') returnValue = c.stake;
            else if (c.status === 'Meio Green') returnValue = (c.stake * c.odd) / 2 + (c.stake / 2);
            else if (c.status === 'Meio Red') returnValue = (c.stake / 2);

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
    if (bet.coverages.filter(c => c.status === 'Green').length > 1) {
        console.log('🎯 Multi-Green Bet:', {
            event: bet.event,
            coverages: bet.coverages.map(c => ({
                stake: c.stake,
                odd: c.odd,
                status: c.status,
                manualReturn: c.manualReturn,
                autoReturn: c.status === 'Green' ? (c.stake * c.odd) : 0
            })),
            totalStake,
            totalReturn,
            extraGain: bet.extraGain,
            profit
        });
    }

    return { totalStake, totalReturn, profit };
};
