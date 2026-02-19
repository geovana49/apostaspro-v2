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
    maxWidth: 1920, // Full HD for maximum sharpness
    maxHeight: 1920,
    quality: 0.90, // High quality for crisp text
    maxSizeMB: 0.95 // Maximum safe limit for Firestore (1MB limit)
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

                    // Mantemos a qualidade acima de 0.85 para não perder a legibilidade
                    while (base64.length > maxBytes && quality > 0.85 && iterations < 5) {
                        quality -= 0.02;
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
 * Comprime uma string Base64
 */
export async function compressBase64(
    base64: string,
    options: CompressionOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Erro ao carregar imagem base64'));

        img.onload = () => {
            try {
                // Dimensões
                let { width, height } = img;
                if (width > opts.maxWidth! || height > opts.maxHeight!) {
                    const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Contexto canvas falhou'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                let quality = opts.quality!;
                let newBase64 = canvas.toDataURL('image/webp', quality);

                // Compressão progressiva
                const maxBytes = (opts.maxSizeMB! * 1024 * 1024);
                let iterations = 0;
                while (newBase64.length > maxBytes && quality > 0.5 && iterations < 5) {
                    quality -= 0.1;
                    newBase64 = canvas.toDataURL('image/webp', quality);
                    iterations++;
                }

                resolve(newBase64);
            } catch (e) {
                reject(e);
            }
        };

        img.src = base64;
    });
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

/**
 * Converte Base64 para Blob (Binário)
 * Reduz o tamanho do payload em ~33% em comparação ao Base64
 */
export function base64ToBlob(base64: string): Blob {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
}

/**
 * Comprime uma imagem diretamente para Blob
 */
export async function compressImageToBlob(
    file: File,
    options: CompressionOptions = {}
): Promise<Blob> {
    const base64 = await compressImage(file, options);
    return base64ToBlob(base64);
}
