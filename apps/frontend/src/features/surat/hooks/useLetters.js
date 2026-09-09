
import { useEffect, useState, useCallback } from "react";
import { getMyLetters } from "../api/letterApi";

export function useLetters() {
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLetters = useCallback(async (initial = false) => {
        try {
            if (initial) {
                setLoading(true);
            }

            const data = await getMyLetters();

            setLetters(data);
        } catch (error) {
            console.error("GET MY LETTERS ERROR:", error);
        } finally {
            if (initial) {
                setLoading(false);
            }
        }
    }, []);

    // ==========================================
    // LOAD PERTAMA KALI
    // ==========================================
    useEffect(() => {
        let isMounted = true;

        const loadLetters = async () => {
            if (!isMounted) return;

            await fetchLetters(true);
        };

        loadLetters();

        return () => {
            isMounted = false;
        };
    }, [fetchLetters]);

    // ==========================================
    // AUTO REFRESH SETIAP 5 DETIK
    // ==========================================
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLetters(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchLetters]);

    return {
        letters,
        loading,
    };
}
