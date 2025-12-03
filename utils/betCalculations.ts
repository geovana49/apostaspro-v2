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
        if (c.status === 'Red') {
            totalReturn += 0;
        } else if (c.manualReturn !== undefined && c.manualReturn !== null) {
            totalReturn += Number(c.manualReturn);
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

    const profit = totalReturn - totalStake;

    return { totalStake, totalReturn, profit };
};
