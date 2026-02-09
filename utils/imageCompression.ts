/**
 * Comprime imagens para base64 otimizado
 * Reduz tamanho mantendo qualidade visual
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.8,
    maxSizeMB: 0.5
};

/**
 * Comprime uma imagem para base64
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));

        reader.onload = (e) => {
            const img = new Image();

            img.onerror = () => reject(new Error('Erro ao carregar imagem'));

            img.onload = () => {
                try {
                    // Calcular dimensões mantendo proporção
                    let { width, height } = img;

                    if (width > opts.maxWidth! || height > opts.maxHeight!) {
                        const ratio = Math.min(
                            opts.maxWidth! / width,
                            opts.maxHeight! / height
                        );
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    // Criar canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Erro ao criar contexto do canvas'));
                        return;
                    }

                    // Desenhar imagem redimensionada
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converter para base64 com compressão WebP (muito superior para textos)
                    let quality = opts.quality!;
                    let base64 = canvas.toDataURL('image/webp', quality);

                    // Se ainda estiver muito grande, reduzir qualidade progressivamente
                    const maxBytes = (opts.maxSizeMB! * 1024 * 1024);
                    let iterations = 0;

                    // Mantemos a qualidade acima de 0.7 para não perder a legibilidade
                    while (base64.length > maxBytes && quality > 0.7 && iterations < 5) {
                        quality -= 0.05;
                        base64 = canvas.toDataURL('image/webp', quality);
                        iterations++;
                    }

                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };

            img.src = e.target?.result as string;
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Comprime múltiplas imagens
 */
export async function compressImages(
    files: File[],
    options: CompressionOptions = {}
): Promise<string[]> {
    const compressed: string[] = [];

    for (const file of files) {
        try {
            const base64 = await compressImage(file, options);
            compressed.push(base64);
        } catch (error) {
            console.error('Erro ao comprimir imagem:', error);
            // Continua com as próximas imagens
        }
    }

    return compressed;
}

/**
 * Estima tamanho total em MB
 */
export function estimateTotalSize(base64Strings: string[]): number {
    const totalBytes = base64Strings.reduce((sum, str) => sum + str.length, 0);
    return totalBytes / (1024 * 1024);
}

/**
 * Valida se o total de imagens cabe no limite do Firestore
 */
export function validateFirestoreSize(base64Strings: string[]): {
    valid: boolean;
    totalMB: number;
    limitMB: number;
} {
    const FIRESTORE_LIMIT_MB = 0.95; // 950KB (margem de segurança)
    const totalMB = estimateTotalSize(base64Strings);

    return {
        valid: totalMB <= FIRESTORE_LIMIT_MB,
        totalMB,
        limitMB: FIRESTORE_LIMIT_MB
    };
}
