import { useEffect, useState } from "react";
import { getMyLetters } from "../api/letterApi";


export function useLetters() {

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {

        const fetchLetters = async () => {

            try {

                const data = await getMyLetters();

                setLetters(data);

            } catch (error) {

                console.error(error);

            } finally {

                setLoading(false);

            }

        };


        fetchLetters();

    }, []);


    return {
        letters,
        loading
    };

}