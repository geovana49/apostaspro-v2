const fs = require('fs');
const path = require('path');

try {
    const data = fs.readFileSync('meus_avatars_premium.json', 'utf8');
    const presets = JSON.parse(data);
    
    // Find the last index that actually has an avatar to determine the length
    let highestIndex = -1;
    for (let i = 0; i < presets.length; i++) {
        if (presets[i] && presets[i].startsWith('data:image')) {
            highestIndex = i;
        }
    }
    
    if (highestIndex === -1) {
        console.error('Nenhum avatar válido encontrado no arquivo JSON!');
        process.exit(1);
    }
    
    // Ensure avatars folder exists
    const avatarsDir = path.join(__dirname, 'public', 'assets', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
    }
    
    let savedCount = 0;
    
    // Export base64 perfectly to PNG
    for (let i = 0; i <= highestIndex; i++) {
        const base64Data = presets[i];
        if (base64Data && base64Data.startsWith('data:image')) {
            // Strip the data:image/png;base64, prefix
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const buffer = Buffer.from(matches[2], 'base64');
                const filePath = path.join(avatarsDir, `suggested_${i + 1}.png`);
                fs.writeFileSync(filePath, buffer);
                savedCount++;
            }
        } else {
            // If the user didn't substitute a specific slot, we'll just keep the original file there if it exists
            console.log(`Slot ${i + 1} mantido com o original.`);
        }
    }
    
    console.log(`\n🎉 SUCESSO! ${savedCount} avatares substituídos foram salvos como novos arquivos PNG definitivos!`);
    console.log(`TOTAL_VALID_AVATARS=${highestIndex + 1}`);

    // Now, let's delete any files beyond highestIndex to clean up the red line stuff
    // The previous array length was 79
    console.log(`\nLimpando arquivos antigos (79 para ${highestIndex + 1})...`);
    for (let j = highestIndex + 2; j <= 100; j++) {
        const filePath = path.join(avatarsDir, `suggested_${j}.png`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    console.log('Arquivos excedentes apagados com sucesso!');

} catch (err) {
    console.error('Erro ao processar JSON:', err);
}
