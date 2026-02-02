export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { image } = req.body;
    const HF_API_KEY = process.env.VITE_HF_API_KEY;

    if (!HF_API_KEY) {
        return res.status(500).json({ error: 'HF_API_KEY not configured on server' });
    }

    try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 1. Captioning
        const captionResponse = await fetch(
            'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large?wait_for_model=true',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
                body: buffer
            }
        );
        const captionData = await captionResponse.json();
        const description = captionData[0]?.generated_text || '';

        // 2. OCR
        const ocrResponse = await fetch(
            'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed?wait_for_model=true',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
                body: buffer
            }
        );
        const ocrData = await ocrResponse.json();
        const extractedText = ocrData[0]?.generated_text || '';

        return res.status(200).json({ description, extractedText });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
