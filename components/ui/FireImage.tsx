import React, { useState, useEffect } from 'react';
import { FirestoreService } from '../../services/firestoreService';
import { auth } from '../../firebase';
import { Loader2, ImageOff } from 'lucide-react';

interface FireImageProps {
    photoId: string;
    parentId: string;
    type?: 'bets' | 'gains';
    alt?: string;
    className?: string;
    onClick?: () => void;
}

// Cache simples em memória para evitar leituras repetidas na mesma sessão
const photoCache: Record<string, string> = {};

export const FireImage: React.FC<FireImageProps> = ({
    photoId,
    parentId,
    type = 'bets',
    alt = 'Foto da aposta',
    className = '',
    onClick
}) => {
    const [src, setSrc] = useState<string | null>(photoCache[photoId] || null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(!photoCache[photoId]);

    useEffect(() => {
        // Se já tiver no cache ou for uma URL externa (legada), não busca
        if (src && (src.startsWith('blob:') || src.startsWith('http'))) {
            setLoading(false);
            return;
        }

        // Se o photoId for na verdade uma URL legada (Firebase Storage), usa direto
        if (photoId.startsWith('http')) {
            setSrc(photoId);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const loadPhoto = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                setError(true);
                setLoading(false);
                return;
            }

            try {
                const dataUrl = await FirestoreService.getPhotoData(userId, parentId, photoId, type);
                if (isMounted) {
                    if (dataUrl) {
                        photoCache[photoId] = dataUrl;
                        setSrc(dataUrl);
                    } else {
                        setError(true);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error("Erro ao carregar FireImage:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadPhoto();

        return () => {
            isMounted = false;
        };
    }, [photoId, parentId, type]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-white/5 rounded-lg animate-pulse ${className}`}>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
        );
    }

    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-white/5 rounded-lg border border-dashed border-white/10 ${className}`}>
                <ImageOff className="w-5 h-5 text-gray-600" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${className} transition-opacity duration-300`}
            onClick={onClick}
            loading="lazy"
        />
    );
};
