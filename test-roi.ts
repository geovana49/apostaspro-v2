
import { calculateArb } from './utils/arbCalc';

const testCases = [
    {
        name: "Surebet Básica (2 casas, Sem Taxas)",
        houses: [
            { odd: 2.0, stake: 100, commission: 0, increase: 0, isFreebet: false, isLay: false, isFixed: true, distribution: true },
            { odd: 2.1, stake: 0, commission: 0, increase: 0, isFreebet: false, isLay: false, isFixed: false, distribution: true }
        ],
        rounding: 0.01
    },
    {
        name: "Surebet com Lay (Back 3.0 vs Lay 3.1, 5% Comm)",
        houses: [
            { odd: 3.0, stake: 100, commission: 0, increase: 0, isFreebet: false, isLay: false, isFixed: true, distribution: true },
            { odd: 3.1, stake: 0, commission: 5, increase: 0, isFreebet: false, isLay: true, isFixed: false, distribution: true }
        ],
        rounding: 0.01
    }
];

testCases.forEach(tc => {
    const result = calculateArb(tc.houses, tc.rounding);
    console.log(`\n--- Test: ${tc.name} ---`);
    console.log(`ROI: ${result.roi.toFixed(4)}%`);
    console.log(`Total Investido: ${result.totalInvested.toFixed(2)}`);
    console.log(`Lucro Mínimo: ${result.minProfit.toFixed(2)}`);
    result.results.forEach((r, i) => {
        console.log(`Casa ${i + 1}: Stake=${r.computedStake.toFixed(2)}, Prof=${r.profitIfWin.toFixed(2)}`);
    });
});
